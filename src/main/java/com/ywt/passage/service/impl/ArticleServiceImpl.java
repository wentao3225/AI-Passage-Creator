package com.ywt.passage.service.impl;

import cn.hutool.core.util.IdUtil;
import com.google.gson.reflect.TypeToken;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import com.ywt.passage.core.service.ArticleAgentService;
import com.ywt.passage.entity.Article;
import com.ywt.passage.entity.User;
import com.ywt.passage.exception.BusinessException;
import com.ywt.passage.exception.ErrorCode;
import com.ywt.passage.exception.ThrowUtils;
import com.ywt.passage.mapper.ArticleMapper;
import com.ywt.passage.model.dto.article.ArticleQueryRequest;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.enums.ArticlePhaseEnum;
import com.ywt.passage.model.enums.ArticleStatusEnum;
import com.ywt.passage.model.enums.ImageMethodEnum;
import com.ywt.passage.model.vo.ArticleVO;
import com.ywt.passage.service.ArticleService;
import com.ywt.passage.utils.GsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import static com.ywt.passage.constant.UserConstant.ADMIN_ROLE;

@Service
@Slf4j
@RequiredArgsConstructor
public class ArticleServiceImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleService {

    private final ArticleAgentService articleAgentService;

    /**
     * 创建文章任务
     *
     * @param topic               选题
     * @param style               文章风格（可为空）
     * @param enabledImageMethods 允许的配图方式列表（可为空）
     * @param loginUser           当前登录用户
     * @return 任务ID
     */
    @Override
    public String createArticleTask(String topic, String style, List<String> enabledImageMethods, User loginUser) {
        // 生成任务ID
        String taskId = IdUtil.simpleUUID();

        // 创建文章记录
        Article article = new Article();
        article.setTaskId(taskId);
        article.setUserId(loginUser.getId());
        article.setTopic(topic);
        article.setStyle(StringUtils.hasText(style) ? style : null);
        article.setEnabledImageMethods(normalizeEnabledMethods(enabledImageMethods));
        article.setStatus(ArticleStatusEnum.PENDING.getValue());
        article.setCreateTime(LocalDateTime.now());

        this.save(article);

        log.info("文章任务已创建, taskId={}, userId={}", taskId, loginUser.getId());
        return taskId;
    }

    /**
     * 规范化并序列化允许的配图方式。
     */
    private String normalizeEnabledMethods(List<String> enabledImageMethods) {
        if (enabledImageMethods == null || enabledImageMethods.isEmpty()) {
            return null;
        }

        List<String> validMethods = enabledImageMethods.stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(ImageMethodEnum::getByValue)
                .filter(method -> method != null && !method.isFallback())
                .map(ImageMethodEnum::getValue)
                .distinct()
                .collect(Collectors.toList());

        if (validMethods.isEmpty()) {
            return null;
        }

        return GsonUtils.toJson(validMethods);
    }

    /**
     * 根据任务ID获取文章
     *
     * @param taskId 任务ID
     * @return 文章实体
     */
    @Override
    public Article getByTaskId(String taskId) {
        return this.getOne(
                QueryWrapper.create().eq("taskId", taskId)
        );
    }

    /**
     * 更新文章状态
     *
     * @param taskId       任务ID
     * @param status       状态枚举
     * @param errorMessage 错误信息（可选）
     */
    @Override
    public void updateArticleStatus(String taskId, ArticleStatusEnum status, String errorMessage) {
        Article article = getByTaskId(taskId);

        if (article == null) {
            log.error("文章记录不存在, taskId={}", taskId);
            return;
        }

        article.setStatus(status.getValue());
        article.setErrorMessage(errorMessage);
        this.updateById(article);

        log.info("文章状态已更新, taskId={}, status={}", taskId, status.getValue());
    }

    /**
     * 保存文章内容
     *
     * @param taskId 任务ID
     * @param state  文章状态对象
     */
    @Override
    public void saveArticleContent(String taskId, ArticleState state) {
        Article article = getByTaskId(taskId);

        if (article == null) {
            log.error("文章记录不存在, taskId={}", taskId);
            return;
        }

        article.setMainTitle(state.getTitle().getMainTitle());
        article.setSubTitle(state.getTitle().getSubTitle());
        article.setOutline(GsonUtils.toJson(state.getOutline().getSections()));
        article.setContent(state.getContent());
        article.setFullContent(state.getFullContent());

        // 保存封面图 URL（从 images 列表中提取 position=1 的 URL）
        if (state.getImages() != null && !state.getImages().isEmpty()) {
            ArticleState.ImageResult cover = state.getImages().stream()
                    .filter(img -> img.getPosition() != null && img.getPosition() == 1)
                    .findFirst()
                    .orElse(null);
            if (cover != null && cover.getUrl() != null) {
                article.setCoverImage(cover.getUrl());
            }
        }
        article.setImages(GsonUtils.toJson(state.getImages()));
        article.setCompletedTime(LocalDateTime.now());

        this.updateById(article);
        log.info("文章保存成功, taskId={}", taskId);
    }

    /**
     * 确认标题
     *
     * @param taskId          任务ID
     * @param mainTitle       选中的主标题
     * @param subTitle        选中的副标题
     * @param userDescription 用户补充描述
     * @param loginUser       当前登录用户
     */
    @Override
    public void confirmTitle(String taskId, String mainTitle, String subTitle, String userDescription, User loginUser) {
        // 校验存在性和权限
        Article article = getByTaskId(taskId);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR, "文章记录不存在");
        checkArticlePermission(article, loginUser);

        // 校验当前阶段（必须是TITLE_SELECTING）
        ArticlePhaseEnum currentPhase = ArticlePhaseEnum.getByValue(article.getPhase());
        ThrowUtils.throwIf(!currentPhase.equals(ArticlePhaseEnum.TITLE_SELECTING),
                ErrorCode.OPERATION_ERROR, "当前阶段不允许此操作");

        // 保存用户选择的标题和用户描述
        article.setMainTitle(mainTitle);
        article.setSubTitle(subTitle);
        article.setUserDescription(userDescription);
        article.setPhase(ArticlePhaseEnum.OUTLINE_GENERATING.getValue());

        this.updateById(article);
        log.info("文章标题已确认, taskId={}, mainTitle={}, subTitle={}, userDescription={}",
                taskId, mainTitle, subTitle, userDescription);
    }

    /**
     * 校验并准备重新生成标题。
     *
     * @param taskId    任务ID
     * @param loginUser 当前登录用户
     * @return 当前文章记录（包含选题与风格）
     */
    @Override
    public Article prepareTitleRegeneration(String taskId, User loginUser) {
        Article article = getByTaskId(taskId);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR, "文章记录不存在");
        checkArticlePermission(article, loginUser);

        ArticlePhaseEnum currentPhase = ArticlePhaseEnum.getByValue(article.getPhase());
        ThrowUtils.throwIf(!ArticlePhaseEnum.TITLE_SELECTING.equals(currentPhase),
                ErrorCode.OPERATION_ERROR, "当前阶段不允许重新生成标题");

        article.setPhase(ArticlePhaseEnum.TITLE_GENERATING.getValue());
        this.updateById(article);

        log.info("准备重新生成标题, taskId={}, topic={}, style={}",
                taskId, article.getTopic(), article.getStyle());
        return article;
    }

    /**
     * 校验并准备从指定阶段重跑。
     */
    @Override
    public Article preparePhaseRestart(String taskId, ArticlePhaseEnum targetPhase, User loginUser) {
        Article article = getByTaskId(taskId);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR, "文章记录不存在");
        checkArticlePermission(article, loginUser);

        ArticleStatusEnum currentStatus = ArticleStatusEnum.getByValue(article.getStatus());
        ThrowUtils.throwIf(ArticleStatusEnum.PROCESSING.equals(currentStatus),
                ErrorCode.OPERATION_ERROR, "文章正在处理中，暂不支持重跑");

        ThrowUtils.throwIf(targetPhase == null, ErrorCode.PARAMS_ERROR, "目标阶段不能为空");

        switch (targetPhase) {
            case TITLE_GENERATING -> resetForTitleRestart(article);
            case OUTLINE_GENERATING -> resetForOutlineRestart(article);
            case CONTENT_GENERATING -> resetForContentRestart(article);
            default -> throw new BusinessException(ErrorCode.PARAMS_ERROR, "当前阶段不支持重跑");
        }

        article.setPhase(targetPhase.getValue());
        article.setStatus(ArticleStatusEnum.PROCESSING.getValue());
        article.setErrorMessage(null);
        article.setCompletedTime(null);

        this.updateById(article);
        log.info("准备从阶段重跑, taskId={}, targetPhase={}, status={}",
                taskId, targetPhase.getValue(), article.getStatus());
        return article;
    }

    /**
     * 从标题阶段重跑时，清空所有下游产物，重新回到标题生成。
     */
    private void resetForTitleRestart(Article article) {
        ThrowUtils.throwIf(!StringUtils.hasText(article.getTopic()),
                ErrorCode.OPERATION_ERROR, "缺少选题，无法从标题阶段重跑");

        article.setTitleOptions(null);
        article.setMainTitle(null);
        article.setSubTitle(null);
        article.setUserDescription(null);
        article.setOutline(null);
        article.setContent(null);
        article.setFullContent(null);
        article.setCoverImage(null);
        article.setImages(null);
    }

    /**
     * 从大纲阶段重跑时，保留已确认标题，清空大纲及其下游产物。
     */
    private void resetForOutlineRestart(Article article) {
        ThrowUtils.throwIf(!StringUtils.hasText(article.getMainTitle()) || !StringUtils.hasText(article.getSubTitle()),
                ErrorCode.OPERATION_ERROR, "缺少已确认标题，无法从大纲阶段重跑");

        article.setOutline(null);
        article.setContent(null);
        article.setFullContent(null);
        article.setCoverImage(null);
        article.setImages(null);
    }

    /**
     * 从正文阶段重跑时，保留标题和大纲，仅清空正文与配图结果。
     */
    private void resetForContentRestart(Article article) {
        ThrowUtils.throwIf(!StringUtils.hasText(article.getMainTitle()) || !StringUtils.hasText(article.getSubTitle()),
                ErrorCode.OPERATION_ERROR, "缺少已确认标题，无法从正文阶段重跑");
        ThrowUtils.throwIf(!StringUtils.hasText(article.getOutline()),
                ErrorCode.OPERATION_ERROR, "缺少已确认大纲，无法从正文阶段重跑");

        article.setContent(null);
        article.setFullContent(null);
        article.setCoverImage(null);
        article.setImages(null);
    }

    /**
     * 确认大纲
     *
     * @param taskId    任务ID
     * @param outline   用户编辑后的大纲
     * @param loginUser 当前登录用户
     */
    @Override
    public void confirmOutline(String taskId, List<ArticleState.OutlineSection> outline, User loginUser) {
        // 校验存在性和权限
        Article article = getByTaskId(taskId);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR, "文章记录不存在");
        checkArticlePermission(article, loginUser);

        // 校验当前阶段（必须是OUTLINE_EDITING）
        ArticlePhaseEnum currentPhase = ArticlePhaseEnum.getByValue(article.getPhase());
        ThrowUtils.throwIf(!currentPhase.equals(ArticlePhaseEnum.OUTLINE_EDITING),
                ErrorCode.OPERATION_ERROR, "当前阶段不允许此操作");

        // 保存用户修改后的大纲
        article.setOutline(GsonUtils.toJson(outline));
        article.setPhase(ArticlePhaseEnum.CONTENT_GENERATING.getValue());

        this.updateById(article);
        log.info("文章大纲已确认, taskId={}, outline={}", taskId, outline);
    }

    /**
     * 更新文章阶段
     *
     * @param taskId 任务ID
     * @param phase  新的阶段枚举
     */
    @Override
    public void updatePhase(String taskId, ArticlePhaseEnum phase) {
        Article article = getByTaskId(taskId);
        if (article == null) {
            log.error("文章记录不存在, taskId={}", taskId);
            return;
        }

        article.setPhase(phase.getValue());
        this.updateById(article);
        log.info("文章阶段已更新, taskId={}, phase={}", taskId, phase.getValue());
    }

    /**
     * 保存标题选项
     *
     * @param taskId       任务ID
     * @param titleOptions 标题选项
     */
    @Override
    public void saveTitleOptions(String taskId, List<ArticleState.TitleOption> titleOptions) {
        Article article = getByTaskId(taskId);
        if (article == null) {
            log.error("文章记录不存在, taskId={}", taskId);
            return;
        }
        article.setTitleOptions(GsonUtils.toJson(titleOptions));
        this.updateById(article);
        log.info("文章标题选项已保存, taskId={}, titleOptions={}", taskId, titleOptions);
    }

    /**
     * AI 修改大纲
     *
     * @param taskId           任务ID
     * @param modifySuggestion 修改建议
     * @param loginUser        当前登录用户
     * @return 修改后的大纲
     */
    @Override
    public List<ArticleState.OutlineSection> aiModifyOutline(String taskId, String modifySuggestion, User loginUser) {
        // 校验存在性和权限
        Article article = getByTaskId(taskId);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR, "文章记录不存在");
        checkArticlePermission(article, loginUser);

        // 校验当前阶段（必须是OUTLINE_EDITING）
        ArticlePhaseEnum currentPhase = ArticlePhaseEnum.getByValue(article.getPhase());
        ThrowUtils.throwIf(!currentPhase.equals(ArticlePhaseEnum.OUTLINE_EDITING),
                ErrorCode.OPERATION_ERROR, "当前阶段不允许此操作");

        // 读取当前大纲
        List<ArticleState.OutlineSection> currentOutline = GsonUtils
                .fromJson(article.getOutline(), new TypeToken<>() {
                });

        // 调用 AI 修改大纲
        List<ArticleState.OutlineSection> modifyOutline = articleAgentService.aiModifyOutline(
                article.getMainTitle(),
                article.getSubTitle(),
                currentOutline,
                modifySuggestion);

        // 保存修改后的大纲
        article.setOutline(GsonUtils.toJson(modifyOutline));
        this.updateById(article);
        log.info("文章大纲已修改, taskId={}, modifySuggestion={}, modifyOutline={}", taskId, modifySuggestion, modifyOutline);
        return modifyOutline;
    }

    /**
     * 分页查询文章列表
     *
     * @param request   查询请求
     * @param loginUser 当前登录用户
     * @return 分页结果
     */
    @Override
    public Page<ArticleVO> listArticleByPage(ArticleQueryRequest request, User loginUser) {
        long current = request.getCurrent();
        long size = request.getPageSize();

        // 构建查询条件
        QueryWrapper queryWrapper = QueryWrapper.create()
                .eq("isDelete", 0)
                .orderBy("createTime", false);

        // 非管理员只能查看自己的文章
        if (!ADMIN_ROLE.equals(loginUser.getUserRole())) {
            queryWrapper.eq("userId", loginUser.getId());
        } else if (request.getUserId() != null) {
            queryWrapper.eq("userId", request.getUserId());
        }

        // 按状态筛选
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            queryWrapper.eq("status", request.getStatus());
        }

        // 分页查询
        Page<Article> articlePage = this.page(new Page<>(current, size), queryWrapper);

        // 转换为 VO
        return convertToVOPage(articlePage);
    }

    /**
     * 删除文章（带权限校验）
     *
     * @param id        文章ID
     * @param loginUser 当前登录用户
     * @return 是否成功
     */
    @Override
    public boolean deleteArticle(Long id, User loginUser) {
        Article article = this.getById(id);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR);

        // 校验权限：只能删除自己的文章（管理员除外）
        checkArticlePermission(article, loginUser);

        // 逻辑删除
        return this.removeById(id);
    }

    /**
     * 获取文章详情（带权限校验）
     *
     * @param taskId    任务ID
     * @param loginUser 当前登录用户
     * @return 文章详情
     */
    @Override
    public ArticleVO getArticleDetail(String taskId, User loginUser) {
        Article article = getByTaskId(taskId);
        ThrowUtils.throwIf(article == null, ErrorCode.NOT_FOUND_ERROR, "文章不存在");

        // 校验权限：只能查看自己的文章（管理员除外）
        checkArticlePermission(article, loginUser);

        return ArticleVO.objToVo(article);
    }


    /**
     * 将文章分页结果转换为 VO 分页
     *
     * @param articlePage 文章分页
     * @return VO 分页
     */
    private Page<ArticleVO> convertToVOPage(Page<Article> articlePage) {
        Page<ArticleVO> articleVOPage = new Page<>();
        articleVOPage.setPageNumber(articlePage.getPageNumber());
        articleVOPage.setPageSize(articlePage.getPageSize());
        articleVOPage.setTotalRow(articlePage.getTotalRow());

        List<ArticleVO> articleVOList = articlePage.getRecords().stream()
                .map(ArticleVO::objToVo)
                .collect(Collectors.toList());
        articleVOPage.setRecords(articleVOList);

        return articleVOPage;
    }

    /**
     * 校验文章权限
     *
     * @param article   文章
     * @param loginUser 当前用户
     */
    private void checkArticlePermission(Article article, User loginUser) {
        if (!article.getUserId().equals(loginUser.getId()) &&
                !ADMIN_ROLE.equals(loginUser.getUserRole())) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
    }
}
