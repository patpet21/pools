/*
  # Create property tokens table

  1. New Tables
    - `property_tokens`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `property_name` (text)
      - `symbol` (text)
      - `owner_wallet` (text)
      - `contract_address` (text)

  2. Security
    - Enable RLS on `property_tokens` table
    - Add policies for authenticated users to:
      - Read their own tokens
      - Insert new tokens
*/

CREATE TABLE IF NOT EXISTS property_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  property_name text NOT NULL,
  symbol text NOT NULL,
  owner_wallet text NOT NULL,
  contract_address text NOT NULL
);

ALTER TABLE property_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
  ON property_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = owner_wallet);

CREATE POLICY "Users can insert tokens"
  ON property_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = owner_wallet);