drop table FRIENDSHIP cascade constraints;

create table FRIENDSHIP (
  user_id_1 number not null,
  user_id_2 number not null,
  status varchar2(20) not null,
  created_at timestamp default current_timestamp not null,
  constraint pk_friendship primary key (user_id_1, user_id_2),
  constraint fk_friendship_user_1 foreign key (user_id_1) references USERS(user_id),
  constraint fk_friendship_user_2 foreign key (user_id_2) references USERS(user_id),
  constraint ck_friendship_distinct_users check (user_id_1 <> user_id_2)
);

exit;
