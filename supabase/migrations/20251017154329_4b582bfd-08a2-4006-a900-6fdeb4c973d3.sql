-- Fix infinite recursion in user_roles RLS policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));