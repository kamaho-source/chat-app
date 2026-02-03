package com.example.chat.model;

import com.example.chat.model.BaseEntity;
import com.example.chat.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "project_chat_messages")
public class ProjectChatMessage extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Project project;

  @ManyToOne(optional = false)
  private User sender;

  @Column(columnDefinition = "TEXT")
  private String content;

  public Long getId() {
    return id;
  }

  public Project getProject() {
    return project;
  }

  public void setProject(Project project) {
    this.project = project;
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
}
