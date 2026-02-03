package com.example.chat.model;

import com.example.chat.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "project_users")
public class ProjectUser {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Project project;

  @ManyToOne(optional = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ProjectRole role = ProjectRole.MEMBER;

  @Column(nullable = false)
  private boolean visible = true;

  public Long getId() {
    return id;
  }

  public Project getProject() {
    return project;
  }

  public void setProject(Project project) {
    this.project = project;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }

  public ProjectRole getRole() {
    return role;
  }

  public void setRole(ProjectRole role) {
    this.role = role;
  }

  public boolean isVisible() {
    return visible;
  }

  public void setVisible(boolean visible) {
    this.visible = visible;
  }
}
