-- Ejecuta esto en Supabase → SQL Editor (después de crear tablas y RLS base).
-- 1) Promociona tu cuenta a administrador (cambia el email por el tuyo):
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-correo@ejemplo.com';

-- 2) Permite que usuarios con rol admin actualicen / borren / inserten productos desde la app web.
DROP POLICY IF EXISTS "Admin puede actualizar productos" ON public.products;
CREATE POLICY "Admin puede actualizar productos"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin puede eliminar productos" ON public.products;
CREATE POLICY "Admin puede eliminar productos"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin puede insertar productos" ON public.products;
CREATE POLICY "Admin puede insertar productos"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
