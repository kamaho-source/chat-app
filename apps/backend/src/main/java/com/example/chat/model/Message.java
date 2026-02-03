package com.example.chat.model;

import com.example.chat.model.Channel;
import com.example.chat.model.BaseEntity;
import com.example.chat.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "messages")
public class Message extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Channel channel;

  @ManyToOne(optional = false)
  private User sender;

  @Column(columnDefinition = "TEXT")
  private String content;

  private String attachmentUrl;

  @Column(nullable = false)
  private boolean edited = false;

  public Long getId() {
    return id;
  }

  public Channel getChannel() {
    return channel;
  }

  public void setChannel(Channel channel) {
    this.channel = channel;
  }

  public User getSender() {
    return sender;
  }

  public void setSender(User sender) {
    this.sender = sender;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public String getAttachmentUrl() {
    return attachmentUrl;
  }

  public void setAttachmentUrl(String attachmentUrl) {
    this.attachmentUrl = attachmentUrl;
  }

  public boolean isEdited() {
    return edited;
  }

  public void setEdited(boolean edited) {
    this.edited = edited;
  }
}
