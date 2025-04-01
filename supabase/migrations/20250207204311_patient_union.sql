-- Delete specific users using the delete_user_cascade function
DO $$
BEGIN
  -- Delete each user
  PERFORM delete_user_cascade('e0c28946-b93c-4627-bb10-28f15a267bc9');
  PERFORM delete_user_cascade('4d614797-7395-4784-87bc-b0cb9b68f8b7');
  PERFORM delete_user_cascade('e8de8fcc-e410-47e5-b953-d2a04d65f2c0');
  PERFORM delete_user_cascade('d8417d3b-8666-4f2e-aa83-22dcbf79a303');
  PERFORM delete_user_cascade('6f2c837a-e7b7-45d7-8eef-a3acb506b700');
  PERFORM delete_user_cascade('7d674107-a893-4927-bfb3-9b85b683c6b3');
  PERFORM delete_user_cascade('62237540-8841-4487-bcac-30d3486046dc');
END;
$$;