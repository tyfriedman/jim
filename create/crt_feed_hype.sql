drop table FEED_HYPE cascade constraints;

create table FEED_HYPE (
  log_id number not null,
  user_id number not null,
  created_at timestamp default current_timestamp not null,
  constraint pk_feed_hype primary key (log_id, user_id),
  constraint fk_feed_hype_log foreign key (log_id) references WORKOUT_LOG(log_id),
  constraint fk_feed_hype_user foreign key (user_id) references USERS(user_id)
);

exit;
