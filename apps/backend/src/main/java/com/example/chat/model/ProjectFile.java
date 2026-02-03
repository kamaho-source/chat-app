package com.example.chat.model;

import com.example.chat.model.BaseEntity;
import com.example.chat.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "project_files")
public class ProjectFile extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Project project;

  @ManyToOne(optional = false)
  private User uploadedBy;

  @Column(nullable = false)
  private String filename;

  @Column(nullable = false)
  private String url;

  @Column(nullable = false)
  private long size;

  public Long getId() {
    return id;
  }

  public Project getProject() {
    return project;
  }

  public void setProject(Project project) {
    this.project = project;
  }

  public User getUploadedBy() {
    return uploadedBy;
  }

  public void setUploadedBy(User uploadedBy) {
    this.uploadedBy = uploadedBy;
  }

  public String getFilename() {
    return filename;
  }

  public void setFilename(String filename) {
    this.filename = filename;
  }

  public String getUrl() {
    return url;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  public long getSize() {
    return size;
  }

  public void setSize(long size) {
    this.size = size;
  }
}
