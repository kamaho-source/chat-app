package com.example.chat.model;

import com.example.chat.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "channel_members")
public class ChannelMember {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Channel channel;

  @ManyToOne(optional = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ChannelRole role = ChannelRole.MEMBER;

  @Column(nullable = false)
  private boolean canPost = true;

  public Long getId() {
    return id;
  }

  public Channel getChannel() {
    return channel;
  }

  public void setChannel(Channel channel) {
    this.channel = channel;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }

  public ChannelRole getRole() {
    return role;
  }

  public void setRole(ChannelRole role) {
    this.role = role;
  }

  public boolean isCanPost() {
    return canPost;
  }

  public void setCanPost(boolean canPost) {
    this.canPost = canPost;
  }
}
