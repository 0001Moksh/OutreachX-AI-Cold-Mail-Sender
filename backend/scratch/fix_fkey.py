from database import engine
from sqlalchemy import text

with engine.connect() as con:
    con.execute(text('ALTER TABLE leads DROP CONSTRAINT leads_campaign_id_fkey;'))
    con.execute(text('ALTER TABLE leads ADD CONSTRAINT leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;'))
    con.commit()
print("Constraint updated.")
