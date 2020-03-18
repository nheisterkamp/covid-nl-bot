drop table if exists gemeenten;

create table gemeenten (
  id serial,
  nummer int not null,
  naam text not null,
  gevallen int not null,
  bevolking int not null,
  start_date timestamp not null default CURRENT_TIMESTAMP,
  stop_date timestamp default null
);

-- create table chats (
--   chat_id int primary key
-- );
