package com.ego.ethicai.util;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
public class EmailUtil {

    private static final Logger logger = LoggerFactory.getLogger(EmailUtil.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${frontend.url}")
    private String frontendUrl;

    public EmailUtil(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        logger.info("EmailUtil initialized with JavaMailSender: {}", mailSender.getClass().getName());
        logger.debug("Mail configuration: MAIL_FROM={}, frontendUrl={}", fromEmail, frontendUrl);
    }

    public void sendActivationEmail(String to, String token) {
        try {
            logger.info("Starting to send activation email to: {}", to);
            logger.debug("Mail configuration check - fromEmail: {}, frontendUrl: {}", fromEmail, frontendUrl);
            logger.debug("JavaMailSender instance: {}", mailSender);

            MimeMessage message = mailSender.createMimeMessage();
            logger.debug("Created MimeMessage instance: {}", message);

            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            logger.debug("Created MimeMessageHelper instance");
            
            // Construct the activation URL
            String activationLink = String.format("%s/activation?token=%s", frontendUrl, token);
            logger.debug("Generated activation link: {}", activationLink);
            
            try {
                helper.setFrom(fromEmail);
                logger.debug("Set 'from' address: {}", fromEmail);
            } catch (Exception e) {
                logger.error("Error setting 'from' address: {}", e.getMessage(), e);
                throw e;
            }

            try {
                helper.setTo(to);
                logger.debug("Set 'to' address: {}", to);
            } catch (Exception e) {
                logger.error("Error setting 'to' address: {}", e.getMessage(), e);
                throw e;
            }

            helper.setSubject("Activate Your EthicAI Account");
            logger.debug("Set email subject");
            
            String emailContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>" +
                "<h2 style='color: #2563eb; margin-bottom: 20px;'>Welcome to EthicAI!</h2>" +
                "<p style='color: #374151; line-height: 1.6;'>Thank you for registering. To complete your registration and activate your account, please click the button below:</p>" +
                "<div style='text-align: center; margin: 30px 0;'>" +
                "<a href='" + activationLink + "' style='background-color: #2563eb; color: white; padding: 12px 24px; " +
                "text-decoration: none; border-radius: 5px; font-weight: 500; display: inline-block;'>Activate Account</a>" +
                "</div>" +
                "<p style='color: #374151; margin-top: 20px;'>If the button doesn't work, you can copy and paste this link into your browser:</p>" +
                "<p style='word-break: break-all; color: #2563eb; margin-bottom: 20px;'>" + activationLink + "</p>" +
                "<p style='color: #374151; font-size: 14px;'>This activation link will expire in 24 hours.</p>" +
                "<hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;'>" +
                "<p style='color: #6b7280; font-size: 14px;'>Best regards,<br>The EthicAI Team</p>" +
                "</div>";

            helper.setText(emailContent, true);
            logger.debug("Set email content");
            
            logger.info("Attempting to send email...");
            try {
                mailSender.send(message);
                logger.info("Email sent successfully to: {}", to);
            } catch (Exception e) {
                logger.error("Failed to send email. JavaMailSender error: {}", e.getMessage(), e);
                logger.error("Mail properties: {}", System.getProperties());
                throw e;
            }
            
        } catch (MessagingException e) {
            logger.error("Failed to send activation email to: {}. Error: {}", to, e.getMessage(), e);
            logger.error("Stack trace: ", e);
            throw new RuntimeException("Failed to send activation email: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error while sending activation email to: {}. Error: {}", to, e.getMessage(), e);
            logger.error("Stack trace: ", e);
            throw new RuntimeException("Unexpected error while sending activation email: " + e.getMessage());
        }
    }
}