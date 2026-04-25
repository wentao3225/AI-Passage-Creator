package com.ywt.passage.service;

import com.ywt.passage.model.dto.image.ImageData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 本地图片存储服务
 * 将图片统一保存到项目 resources/static/uploads 目录，并返回可访问的静态资源 URL
 */
@Service
@Slf4j
public class LocalImageStorageService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Value("${app.image-upload.local-dir:src/main/resources/static/uploads}")
    private String localDir;

    @Value("${app.image-upload.access-url-prefix:http://localhost:8567/api/uploads}")
    private String accessUrlPrefix;

    /**
     * 保存图片数据到本地静态目录
     *
     * @param imageData 图片数据
     * @param folder    业务子目录
     * @return 可直接访问的图片 URL
     */
    public String uploadImageData(ImageData imageData, String folder) {
        if (imageData == null || !imageData.isValid()) {
            return null;
        }

        try {
            StoredImage storedImage = resolveStoredImage(imageData);
            if (storedImage == null || storedImage.bytes().length == 0) {
                return null;
            }

            String safeFolder = sanitizeFolder(folder);
            String dateFolder = LocalDate.now().format(DATE_FORMATTER);
            String extension = storedImage.extension();
            String fileName = UUID.randomUUID().toString().replace("-", "") + extension;

            Path targetDir = resolveUploadRoot().resolve(safeFolder).resolve(dateFolder);
            Files.createDirectories(targetDir);

            Path targetFile = targetDir.resolve(fileName);
            Files.write(targetFile, storedImage.bytes());

            String relativePath = safeFolder + "/" + dateFolder + "/" + fileName;
            String accessUrl = buildAccessUrl(relativePath);
            log.info("图片保存到本地成功, path={}, url={}", targetFile, accessUrl);
            return accessUrl;
        } catch (Exception e) {
            log.error("图片保存到本地失败, folder={}", folder, e);
            return null;
        }
    }

    /**
     * 直接将外部 URL 保存到本地
     */
    public String uploadImageUrl(String imageUrl, String folder) {
        return uploadImageData(ImageData.fromUrl(imageUrl), folder);
    }

    /**
     * 获取本地上传根目录绝对路径
     */
    public Path resolveUploadRoot() {
        return Paths.get(localDir).toAbsolutePath().normalize();
    }

    private StoredImage resolveStoredImage(ImageData imageData) throws IOException, InterruptedException {
        if (imageData.getDataType() == ImageData.DataType.BYTES || imageData.getDataType() == ImageData.DataType.DATA_URL) {
            byte[] bytes = imageData.getImageBytes();
            if (bytes == null || bytes.length == 0) {
                return null;
            }
            return new StoredImage(bytes, imageData.getFileExtension());
        }

        if (imageData.getDataType() != ImageData.DataType.URL || !StringUtils.hasText(imageData.getUrl())) {
            return null;
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(imageData.getUrl()))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "AI-Passage-Creator/1.0")
                .GET()
                .build();

        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("下载远程图片失败, status={}, url={}", response.statusCode(), imageData.getUrl());
            return null;
        }

        byte[] bytes = response.body();
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        String extension = resolveExtension(response.headers().firstValue("Content-Type").orElse(imageData.getMimeType()), imageData.getUrl());
        return new StoredImage(bytes, extension);
    }

    private String buildAccessUrl(String relativePath) {
        String normalizedPrefix = accessUrlPrefix.endsWith("/")
                ? accessUrlPrefix.substring(0, accessUrlPrefix.length() - 1)
                : accessUrlPrefix;
        String encodedPath = encodeRelativePath(relativePath);
        return normalizedPrefix + "/" + encodedPath;
    }

    private String encodeRelativePath(String relativePath) {
        String[] segments = relativePath.split("/");
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) {
                encoded.append('/');
            }
            encoded.append(URLEncoder.encode(segments[i], StandardCharsets.UTF_8));
        }
        return encoded.toString();
    }

    private String sanitizeFolder(String folder) {
        if (!StringUtils.hasText(folder)) {
            return "default";
        }
        return folder.replaceAll("[^a-zA-Z0-9/_-]", "-");
    }

    private String resolveExtension(String contentType, String sourceUrl) {
        if (StringUtils.hasText(contentType)) {
            return switch (contentType.toLowerCase()) {
                case "image/jpeg", "image/jpg" -> ".jpg";
                case "image/png" -> ".png";
                case "image/gif" -> ".gif";
                case "image/webp" -> ".webp";
                case "image/svg+xml" -> ".svg";
                default -> extractExtensionFromUrl(sourceUrl);
            };
        }
        return extractExtensionFromUrl(sourceUrl);
    }

    private String extractExtensionFromUrl(String sourceUrl) {
        if (!StringUtils.hasText(sourceUrl)) {
            return ".png";
        }

        String cleanedUrl = sourceUrl;
        int queryIndex = cleanedUrl.indexOf('?');
        if (queryIndex >= 0) {
            cleanedUrl = cleanedUrl.substring(0, queryIndex);
        }

        int dotIndex = cleanedUrl.lastIndexOf('.');
        int slashIndex = cleanedUrl.lastIndexOf('/');
        if (dotIndex > slashIndex) {
            String extension = cleanedUrl.substring(dotIndex).toLowerCase();
            if (extension.matches("\\.(jpg|jpeg|png|gif|webp|svg)")) {
                return ".jpeg".equals(extension) ? ".jpg" : extension;
            }
        }

        return ".png";
    }

    private record StoredImage(byte[] bytes, String extension) {
    }
}