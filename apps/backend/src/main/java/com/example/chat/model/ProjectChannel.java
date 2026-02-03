package com.example.chat.model;

import com.example.chat.model.Channel;
import jakarta.persistence.*;

@Entity
@Table(name = "project_channels")
public class ProjectChannel {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Project project;

  @ManyToOne(optional = false)
  private Channel channel;

  public Long getId() {
    return id;
  }

  public Project getProject() {
    return project;
  }

  public void setProject(Project project) {
    this.project = project;
  }

  public Channel getChannel() {
    return channel;
  }

  public void setChannel(Channel channel) {
    this.channel = channel;
  }
}
