-- ============================================================================
-- CATEGORY 4: Fix rls_policy_always_true
-- Scope service_role policies and restrict course/lesson write access
-- ============================================================================

-- A) Restrict courses write access to admins only
DROP POLICY IF EXISTS "courses_auth_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_auth_update" ON public.courses;

-- Only admins can insert/update courses
CREATE POLICY "admin_can_insert_courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "admin_can_update_courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- B) Restrict lessons write access to admins only
DROP POLICY IF EXISTS "lessons_auth_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_auth_update" ON public.lessons;

CREATE POLICY "admin_can_insert_lessons"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "admin_can_update_lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

