-- Opprett tabell for Vipps-betalinger
-- Denne tabellen lagrer betalingsinformasjon fra Vipps direkte integrasjon

CREATE TABLE IF NOT EXISTS vipps_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Betalingsdetaljer
    status TEXT NOT NULL, -- 'reserved', 'captured', 'cancelled', 'refunded', 'failed'
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'NOK',
    
    -- Tidspunkter
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    captured_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    -- Vipps-spesifikt
    vipps_transaction_id TEXT,
    vipps_merchant_serial_number TEXT,
    
    -- Feilhåndtering
    failure_reason TEXT,
    
    -- Metadata
    raw_data JSONB,
    description TEXT,
    
    -- Abonnement-kobling (hvis dette er et abonnement)
    subscription_id TEXT,
    is_subscription BOOLEAN DEFAULT FALSE
);

-- Indekser for rask oppslag
CREATE INDEX IF NOT EXISTS idx_vipps_payments_order_id ON vipps_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_vipps_payments_user_id ON vipps_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_vipps_payments_status ON vipps_payments(status);
CREATE INDEX IF NOT EXISTS idx_vipps_payments_created_at ON vipps_payments(created_at);

-- Oppdatert timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vipps_payments_updated_at ON vipps_payments;
CREATE TRIGGER update_vipps_payments_updated_at
    BEFORE UPDATE ON vipps_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE vipps_payments ENABLE ROW LEVEL SECURITY;

-- Brukere kan kun se egne betalinger
CREATE POLICY "Users can view own vipps payments"
    ON vipps_payments FOR SELECT
    USING (auth.uid() = user_id);

-- Admins kan se alle betalinger
CREATE POLICY "Admins can view all vipps payments"
    ON vipps_payments FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Kommentar
COMMENT ON TABLE vipps_payments IS 'Lagrer Vipps betalingsinformasjon fra direkte Vipps API integrasjon';
