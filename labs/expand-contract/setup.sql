create table users (
  id serial primary key,
  fullname text not null
);
insert into users (fullname) values ('Ana Reyes'), ('Ben Cruz');
