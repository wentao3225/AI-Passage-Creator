package com.ywt.passage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@EnableAspectJAutoProxy(exposeProxy = true)
public class AiPassageCreatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiPassageCreatorApplication.class, args);
        System.out.println("Service Start Successful ~~");
    }

}
