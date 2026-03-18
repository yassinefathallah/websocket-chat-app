package com.yafathallah.chat_app.chat;

import lombok.*;
import org.springframework.messaging.handler.annotation.MessageMapping;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

public class ChatMessage {


    private String content;
    private String sender;
    private MessageType type;


}
