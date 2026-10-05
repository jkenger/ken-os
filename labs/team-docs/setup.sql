create table users (id int primary key, name text not null);
create table orgs (id int primary key, name text not null);
create table memberships (
  user_id int not null references users,
  org_id int not null references orgs,
  role text not null check (role in ('viewer', 'editor', 'admin')),
  primary key (user_id, org_id)
);
create table documents (
  id serial primary key,
  org_id int not null references orgs,
  title text not null,
  body text not null
);
insert into users (id, name) values (1, 'Ana'), (2, 'Ben'), (3, 'Cy'), (4, 'Dee');
insert into orgs (id, name) values (1, 'Acme'), (2, 'Globex');
insert into memberships (user_id, org_id, role) values (1, 1, 'editor'), (2, 1, 'viewer'), (3, 2, 'admin');
insert into documents (org_id, title, body) values
  (1, 'Roadmap', 'Ship the beta in May'),
  (1, 'Pricing', 'Three tiers'),
  (2, 'Plans', 'Expand to Europe');
