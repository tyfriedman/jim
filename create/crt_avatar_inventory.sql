drop table AVATAR_INVENTORY cascade constraints;

create table AVATAR_INVENTORY (
  avatar_id number not null,
  slot varchar2(50) not null,
  item_id number not null,
  equipped number(1) default 0 not null,
  constraint pk_avatar_inventory primary key (avatar_id, slot),
  constraint fk_avatar_inventory_avatar foreign key (avatar_id) references AVATAR(avatar_id),
  constraint fk_avatar_inventory_item foreign key (item_id) references AVATAR_ITEM(item_id),
  constraint ck_avatar_inventory_equipped check (equipped in (0, 1))
);

exit;
