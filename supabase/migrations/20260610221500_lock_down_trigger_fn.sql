-- Security: handle_new_user() is SECURITY DEFINER and was executable by
-- anon/authenticated via the Data API's /rpc endpoint (advisor 0028/0029).
-- Only the auth.users trigger should ever run it.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
