import 'dotenv/config';
import { prisma } from './lib/prisma';

async function verify() {
  const secret = process.env.LEADS_API_SECRET;
  if (!secret) {
    console.error('LEADS_API_SECRET not found');
    process.exit(1);
  }

  console.log('Testing Leads API...');
  const payload = {
    some: 'random',
    data: {
      nested: true,
      value: 123
    }
  };

  try {
    const response = await fetch('http://localhost:3001/api/webhooks/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API Request failed: ${response.status} ${text}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (!data.success) {
       console.error('API returned success=false');
       process.exit(1);
    }

    console.log('Verifying in Database...');
    const saved = await prisma.incomingLead.findFirst({
      where: { id: data.id }
    });

    if (!saved) {
      console.error('Record not found in DB!');
      process.exit(1);
    }

    // Check JSON equality roughly
    if (JSON.stringify(saved.payload) !== JSON.stringify(payload)) {
       console.error('Payload mismatch!', saved.payload);
       process.exit(1);
    }

    console.log('Verification Success! Record ID:', saved.id);

  } catch (e) {
    console.error('Verification failed', e);
    process.exit(1);
  }
}

verify();
