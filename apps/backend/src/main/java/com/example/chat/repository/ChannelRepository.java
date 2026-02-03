package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.chat.model.*;

public interface ChannelRepository extends JpaRepository<Channel, Long> {
}
