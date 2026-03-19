create or replace function public.get_or_create_client(_name text, _phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_client_id uuid;
  created_client_id uuid;
begin
  select id
  into existing_client_id
  from public.clients
  where phone = _phone
  order by created_at asc
  limit 1;

  if existing_client_id is not null then
    return existing_client_id;
  end if;

  insert into public.clients (name, phone)
  values (_name, _phone)
  returning id into created_client_id;

  return created_client_id;
end;
$$;

grant execute on function public.get_or_create_client(text, text) to anon, authenticated, service_role;
