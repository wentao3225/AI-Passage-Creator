package com.ywt.passage.service;

import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.service.IService;
import com.ywt.passage.entity.Article;
import com.ywt.passage.entity.User;
import com.ywt.passage.model.dto.article.ArticleQueryRequest;
import com.ywt.passage.model.dto.article.ArticleState;
import com.ywt.passage.model.enums.ArticleStatusEnum;
import com.ywt.passage.model.vo.ArticleVO;

import java.util.List;

/**
 * 文章服务接口
 */
public interface ArticleService extends IService<Article> {

    /**
     * 创建文章任务
     *
     * @param topic     选题
     * @param style     文章风格（可为空）
     * @param enabledImageMethods 允许的配图方式列表（可为空）
     * @param loginUser 当前登录用户
     * @return 任务ID
     */
    String createArticleTask(String topic, String style, List<String> enabledImageMethods, User loginUser);

    /**
     * 根据任务ID获取文章
     *
     * @param taskId 任务ID
     * @return 文章实体
     */
    Article getByTaskId(String taskId);

    /**
     * 获取文章详情（带权限校验）
     *
     * @param taskId    任务ID
     * @param loginUser 当前登录用户
     * @return 文章VO
     */
    ArticleVO getArticleDetail(String taskId, User loginUser);

    /**
     * 分页查询文章列表
     *
     * @param request   查询请求
     * @param loginUser 当前登录用户
     * @return 分页结果
     */
    Page<ArticleVO> listArticleByPage(ArticleQueryRequest request, User loginUser);

    /**
     * 删除文章（带权限校验）
     *
     * @param id        文章ID
     * @param loginUser 当前登录用户
     * @return 是否成功
     */
    boolean deleteArticle(Long id, User loginUser);

    /**
     * 更新文章状态
     *
     * @param taskId       任务ID
     * @param status       状态枚举
     * @param errorMessage 错误信息（可选）
     */
    void updateArticleStatus(String taskId, ArticleStatusEnum status, String errorMessage);

    /**
     * 保存文章内容
     *
     * @param taskId 任务ID
     * @param state  文章状态对象
     */
    void saveArticleContent(String taskId, ArticleState state);
}
