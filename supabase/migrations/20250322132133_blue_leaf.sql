-- Get the form ID for the EMS Field type
DO $$ 
DECLARE
  v_form_id UUID;
BEGIN
  SELECT f.id INTO v_form_id
  FROM clinical_forms f
  JOIN clinical_types t ON t.id = f.clinical_type_id
  WHERE t.name = 'EMS Field'
  LIMIT 1;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'EMS Field form not found';
  END IF;

  -- Create vital signs group fields
  INSERT INTO clinical_form_fields 
  (form_id, field_name, field_type, field_label, required, order_index, is_repeatable, group_key)
  VALUES
    -- Time field
    (v_form_id, 'vital_time', 'time', 'Time', true, 0, true, 'vital_signs'),
    
    -- Blood Pressure
    (v_form_id, 'blood_pressure', 'text', 'Blood Pressure', true, 1, true, 'vital_signs'),
    
    -- Respiratory Rate
    (v_form_id, 'respiratory_rate', 'number', 'Respiratory Rate', true, 2, true, 'vital_signs'),
    
    -- Pulse (Manual)
    (v_form_id, 'pulse_manual', 'number', 'Pulse (Manual)', true, 3, true, 'vital_signs'),
    
    -- SPO2
    (v_form_id, 'spo2', 'number', 'SPO2', true, 4, true, 'vital_signs'),
    
    -- Pain Scale
    (v_form_id, 'pain_scale', 'number', 'Pain Scale', true, 5, true, 'vital_signs'),
    
    -- EtCO2
    (v_form_id, 'etco2', 'number', 'EtCO2', false, 6, true, 'vital_signs'),
    
    -- BGL
    (v_form_id, 'bgl', 'number', 'BGL', false, 7, true, 'vital_signs'),
    
    -- GCS
    (v_form_id, 'gcs', 'number', 'GCS', true, 8, true, 'vital_signs'),
    
    -- Skin
    (v_form_id, 'skin', 'text', 'Skin', true, 9, true, 'vital_signs'),
    
    -- Lung Sounds
    (v_form_id, 'lung_sounds', 'text', 'Lung Sounds', true, 10, true, 'vital_signs'),
    
    -- Cardiac Rhythm
    (v_form_id, 'cardiac_rhythm', 'text', 'Cardiac Rhythm', true, 11, true, 'vital_signs');
END $$;