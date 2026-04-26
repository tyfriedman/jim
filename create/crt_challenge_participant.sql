drop table CHALLENGE_PARTICIPANT cascade constraints;

create table CHALLENGE_PARTICIPANT (
  challenge_id number not null,
  user_id number not null,
  current_value number default 0 not null,
  joined_at timestamp default current_timestamp not null,
  constraint pk_challenge_participant primary key (challenge_id, user_id),
  constraint fk_challenge_participant_challenge foreign key (challenge_id) references CHALLENGE(challenge_id),
  constraint fk_challenge_participant_user foreign key (user_id) references USERS(user_id),
  constraint ck_challenge_participant_current_value check (current_value >= 0)
);

exit;
