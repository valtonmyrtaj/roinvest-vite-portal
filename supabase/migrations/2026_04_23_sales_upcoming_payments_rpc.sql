CREATE OR REPLACE FUNCTION public.list_sales_upcoming_payments(
  p_owner_scope text DEFAULT 'all'::text
)
RETURNS TABLE(
  payment_id uuid,
  payment_unit_id uuid,
  payment_sale_id uuid,
  payment_installment_number integer,
  payment_amount numeric,
  payment_due_date date,
  payment_paid_date date,
  payment_status text,
  payment_notes text,
  payment_created_at timestamp with time zone,
  unit_id uuid,
  unit_code text,
  unit_block text,
  unit_type text,
  unit_level text,
  unit_size numeric,
  unit_price numeric,
  unit_status text,
  unit_owner_category text,
  unit_owner_name text,
  unit_created_at timestamp with time zone,
  unit_updated_at timestamp with time zone,
  sale_final_price numeric,
  sale_date date,
  sale_buyer_name text,
  sale_payment_type text,
  sale_crm_lead_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with normalized_scope as (
    select nullif(trim(coalesce(p_owner_scope, 'all')), '') as owner_scope
  )
  select
    p.id as payment_id,
    p.unit_id::uuid as payment_unit_id,
    p.sale_id as payment_sale_id,
    p.installment_number as payment_installment_number,
    p.amount as payment_amount,
    p.due_date as payment_due_date,
    p.paid_date as payment_paid_date,
    p.status as payment_status,
    p.notes as payment_notes,
    p.created_at as payment_created_at,
    u.id as unit_id,
    u.unit_id as unit_code,
    u.block as unit_block,
    u.type as unit_type,
    u.level as unit_level,
    u.size as unit_size,
    u.price as unit_price,
    u.status as unit_status,
    u.owner_category as unit_owner_category,
    u.owner_name as unit_owner_name,
    u.created_at as unit_created_at,
    u.updated_at as unit_updated_at,
    s.final_price as sale_final_price,
    s.sale_date as sale_date,
    s.buyer_name as sale_buyer_name,
    s.payment_type as sale_payment_type,
    s.crm_lead_id as sale_crm_lead_id
  from public.unit_payments p
  join public.units u on u.id = p.unit_id::uuid
  left join public.unit_sales s
    on s.unit_id = u.id
    and s.status = 'active'
  cross join normalized_scope ns
  where p.status = 'E papaguar'
    and u.status = 'E shitur'
    and (
      ns.owner_scope is null
      or ns.owner_scope = 'all'
      or u.owner_category = ns.owner_scope
    )
  order by p.due_date asc, u.unit_id asc, p.installment_number asc;
$function$;
