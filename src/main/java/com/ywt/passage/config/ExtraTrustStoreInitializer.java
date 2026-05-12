package com.ywt.passage.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509ExtendedTrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 在 Spring 容器刷新前加载额外信任库，修复企业代理场景下的 HTTPS 证书链校验问题。
 */
@Slf4j
public class ExtraTrustStoreInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static volatile SSLContext sharedSslContext;
    private static volatile X509ExtendedTrustManager sharedTrustManager;

    private static final String ENABLED_KEY = "app.ssl.extra-trust-store.enabled";
    private static final String PATH_KEY = "app.ssl.extra-trust-store.path";
    private static final String PASSWORD_KEY = "app.ssl.extra-trust-store.password";
    private static final String TYPE_KEY = "app.ssl.extra-trust-store.type";
    private static final String DEFAULT_RELATIVE_PATH = "certs/dashscope-truststore.jks";

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        Environment environment = applicationContext.getEnvironment();
        boolean enabled = environment.getProperty(ENABLED_KEY, Boolean.class, true);
        if (!enabled) {
            sharedSslContext = null;
            sharedTrustManager = null;
            log.info("额外信任库已禁用，跳过 SSL 初始化");
            return;
        }

        Path trustStorePath = resolveTrustStorePath(environment.getProperty(PATH_KEY, DEFAULT_RELATIVE_PATH));
        if (!Files.exists(trustStorePath)) {
            sharedSslContext = null;
            sharedTrustManager = null;
            log.info("未找到额外信任库，跳过 SSL 初始化: {}", trustStorePath);
            return;
        }

        String password = environment.getProperty(PASSWORD_KEY, "changeit");
        String type = environment.getProperty(TYPE_KEY, "JKS");

        try {
            X509ExtendedTrustManager compositeTrustManager = buildMergedTrustManager(trustStorePath, password, type);
            SSLContext sslContext = buildSslContext(compositeTrustManager);
            SSLContext.setDefault(sslContext);
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());
            sharedSslContext = sslContext;
            sharedTrustManager = compositeTrustManager;

            log.info("额外信任库加载成功: {}", trustStorePath);
        } catch (Exception e) {
            sharedSslContext = null;
            sharedTrustManager = null;
            throw new IllegalStateException("加载额外信任库失败: " + trustStorePath, e);
        }
    }

    public static SSLContext getSharedSslContext() {
        return sharedSslContext;
    }

    public static X509ExtendedTrustManager getSharedTrustManager() {
        return sharedTrustManager;
    }

    private Path resolveTrustStorePath(String configuredPath) {
        Path path = Paths.get(configuredPath);
        if (!path.isAbsolute()) {
            path = Paths.get(System.getProperty("user.dir")).resolve(path);
        }
        return path.toAbsolutePath().normalize();
    }

    private X509ExtendedTrustManager buildMergedTrustManager(Path trustStorePath, String password, String type)
            throws Exception {
        X509ExtendedTrustManager systemTrustManager = loadSystemTrustManager();
        X509ExtendedTrustManager extraTrustManager = loadTrustManager(trustStorePath, password, type);

        return new CompositeX509ExtendedTrustManager(
                List.of(systemTrustManager, extraTrustManager)
        );
    }

    private SSLContext buildSslContext(X509ExtendedTrustManager compositeTrustManager) throws Exception {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, new TrustManager[]{compositeTrustManager}, new SecureRandom());
        return sslContext;
    }

    private X509ExtendedTrustManager loadSystemTrustManager() throws GeneralSecurityException {
        TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                TrustManagerFactory.getDefaultAlgorithm()
        );
        trustManagerFactory.init((KeyStore) null);
        return findX509TrustManager(trustManagerFactory.getTrustManagers());
    }

    private X509ExtendedTrustManager loadTrustManager(Path trustStorePath, String password, String type)
            throws Exception {
        KeyStore keyStore = KeyStore.getInstance(type);
        try (var inputStream = Files.newInputStream(trustStorePath)) {
            keyStore.load(inputStream, password.toCharArray());
        }

        TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                TrustManagerFactory.getDefaultAlgorithm()
        );
        trustManagerFactory.init(keyStore);
        return findX509TrustManager(trustManagerFactory.getTrustManagers());
    }

    private X509ExtendedTrustManager findX509TrustManager(TrustManager[] trustManagers) {
        for (TrustManager trustManager : trustManagers) {
            if (trustManager instanceof X509ExtendedTrustManager extendedTrustManager) {
                return extendedTrustManager;
            }
            if (trustManager instanceof X509TrustManager x509TrustManager) {
                return new DelegatingX509ExtendedTrustManager(x509TrustManager);
            }
        }
        throw new IllegalStateException("未找到 X509TrustManager");
    }

    private static final class DelegatingX509ExtendedTrustManager extends X509ExtendedTrustManager {

        private final X509TrustManager delegate;

        private DelegatingX509ExtendedTrustManager(X509TrustManager delegate) {
            this.delegate = delegate;
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
            delegate.checkClientTrusted(chain, authType);
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
            delegate.checkServerTrusted(chain, authType);
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
            delegate.checkClientTrusted(chain, authType);
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
            delegate.checkServerTrusted(chain, authType);
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            delegate.checkClientTrusted(chain, authType);
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            delegate.checkServerTrusted(chain, authType);
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return delegate.getAcceptedIssuers();
        }
    }

    private static final class CompositeX509ExtendedTrustManager extends X509ExtendedTrustManager {

        private final List<X509ExtendedTrustManager> delegates;

        private CompositeX509ExtendedTrustManager(List<X509ExtendedTrustManager> delegates) {
            this.delegates = delegates;
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
            checkTrusted(manager -> manager.checkClientTrusted(chain, authType, socket));
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
            checkTrusted(manager -> manager.checkServerTrusted(chain, authType, socket));
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
            checkTrusted(manager -> manager.checkClientTrusted(chain, authType, engine));
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
            checkTrusted(manager -> manager.checkServerTrusted(chain, authType, engine));
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            checkTrusted(manager -> manager.checkClientTrusted(chain, authType));
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            checkTrusted(manager -> manager.checkServerTrusted(chain, authType));
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            Set<X509Certificate> certificates = new LinkedHashSet<>();
            for (X509ExtendedTrustManager delegate : delegates) {
                certificates.addAll(Arrays.asList(delegate.getAcceptedIssuers()));
            }
            return certificates.toArray(new X509Certificate[0]);
        }

        private void checkTrusted(TrustCheck trustCheck) throws CertificateException {
            List<CertificateException> exceptions = new ArrayList<>();
            for (X509ExtendedTrustManager delegate : delegates) {
                try {
                    trustCheck.check(delegate);
                    return;
                } catch (CertificateException e) {
                    exceptions.add(e);
                }
            }

            CertificateException certificateException = new CertificateException("当前证书链不被任何已配置信任库信任");
            for (CertificateException exception : exceptions) {
                certificateException.addSuppressed(exception);
            }
            throw certificateException;
        }
    }

    @FunctionalInterface
    private interface TrustCheck {
        void check(X509ExtendedTrustManager trustManager) throws CertificateException;
    }
}