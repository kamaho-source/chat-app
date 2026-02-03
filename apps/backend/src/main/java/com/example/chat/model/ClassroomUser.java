package com.example.chat.model;

import com.example.chat.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "classroom_users")
public class ClassroomUser {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Classroom classroom;

  @ManyToOne(optional = false)
  private User user;

  public Long getId() {
    return id;
  }

  public Classroom getClassroom() {
    return classroom;
  }

  public void setClassroom(Classroom classroom) {
    this.classroom = classroom;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }
}
