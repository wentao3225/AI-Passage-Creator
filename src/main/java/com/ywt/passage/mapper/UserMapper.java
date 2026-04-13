package com.ywt.passage.mapper;

import com.mybatisflex.core.BaseMapper;
import com.ywt.passage.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
