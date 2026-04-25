package com.ywt.passage;

import com.ywt.passage.config.ExtraTrustStoreInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@EnableAspectJAutoProxy(exposeProxy = true)
public class AiPassageCreatorApplication {
    
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(AiPassageCreatorApplication.class);
        application.addInitializers(new ExtraTrustStoreInitializer());
        application.run(args);
        System.out.println("Service Start Successful ~~");
    }
    
}
