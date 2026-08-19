DROP POLICY IF EXISTS "Authenticated users can read usuarios_permitidos" ON public.usuarios_permitidos;

CREATE POLICY "Users can read their own allowed entry"
ON public.usuarios_permitidos
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));