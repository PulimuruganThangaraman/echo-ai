import api from './axios';

const SEEDED_PATIENTS = [
  {
    id: 111,
    patient_id: '123456',
    salutation: 'Mr.',
    first_name: 'ramya',
    last_name: 'Thangaraman',
    gender: 'Female',
    age: 27,
    age_unit: 'Years',
    dob: '1999-08-26',
    mobile: '9663528574',
    phone1: '',
    phone2: '',
    email: 'pulimurugan.thangaraman@sorimtechnologies.com',
    street: '1/96, Kamuthi',
    address: '1/96, Kamuthi',
    district_city: 'Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    country: 'India',
    family_doctor: 'Dr. Pradeep Rao',
    visit_count: 1,
  },
  {
    id: 110,
    patient_id: 'PAT1001234',
    salutation: 'Mrs.',
    first_name: 'sample',
    last_name: 'Sample5',
    gender: 'Female',
    age: 27,
    age_unit: 'Years',
    dob: '1999-08-26',
    mobile: '9363858218',
    phone1: '',
    phone2: '',
    email: 'sample123@gmail.com',
    street: '1/96, Kamuthi',
    address: '1/96, Kamuthi',
    district_city: 'Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    country: 'India',
    marital_status: 'Married',
    ethnic_origin: 'Asian',
    family_doctor: 'Dr. Rajesh V. Varma',
    visit_count: 1,
  },
  {
    id: 109,
    patient_id: 'PAT1001236',
    salutation: 'Ms.',
    first_name: 'sample',
    last_name: 'Sample3',
    gender: 'Female',
    age: 27,
    age_unit: 'Years',
    dob: '1999-08-26',
    mobile: '9363858214',
    phone1: '',
    phone2: '',
    email: 'sample123@gmail.com',
    street: '1/96, Kamuthi',
    address: '1/96, Kamuthi',
    district_city: 'Kochi',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    marital_status: 'Married',
    ethnic_origin: 'Indian',
    family_doctor: 'Dr. Vikramaditya Singh',
    visit_count: 1,
  },
  {
    id: 108,
    patient_id: 'PAT1001235',
    salutation: 'Mrs.',
    first_name: 'sample',
    last_name: 'Sample2',
    gender: 'Female',
    age: 27,
    age_unit: 'Years',
    dob: '1999-08-26',
    mobile: '9363858214',
    phone1: '',
    phone2: '',
    email: 'sample123@gmail.com',
    street: '1/96, Kamuthi',
    address: '1/96, Kamuthi',
    area: 'Kamuthi',
    area_po: 'Kamuthi',
    district_city: 'Ramanathapuram',
    city: 'Ramanathapuram',
    state: 'Tamil Nadu',
    zip_code: '623708',
    pincode: '623708',
    country: 'India',
    marital_status: 'Married',
    ethnic_origin: 'Indian',
    family_doctor: 'Dr. Anil Kumar Mehta',
    visit_count: 1,
  },
  {
    id: 107,
    patient_id: 'PAT000107',
    salutation: 'Mrs.',
    first_name: 'sample',
    last_name: 'sample test',
    gender: 'Male',
    age: 26,
    age_unit: 'Years',
    dob: '2000-08-26',
    mobile: '9887546532',
    phone1: '',
    phone2: '',
    email: 'info@cardioecho.in',
    street: '100 Feet Road, Indiranagar',
    address: '100 Feet Road, Indiranagar',
    area: 'Indiranagar',
    area_po: 'Nandanam',
    taluk: 'Chennai',
    district_city: 'Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zip_code: '600017',
    pincode: '600017',
    country: 'India',
    ethnic_origin: 'Indian',
    marital_status: 'Married',
    fax: '080-45678901',
    family_doctor: '',
    visit_count: 1,
  },
];

const LOCAL_STORAGE_KEY = 'echoai_patients_list';

function getLocalPatients() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) return parsed.data;
    }
  } catch {}
  return SEEDED_PATIENTS;
}

function saveLocalPatients(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

let patientsCache = null;
let patientsRequest = null;

const invalidatePatients = () => {
  patientsCache = null;
  patientsRequest = null;
};

export const patientService = {
  getPatients: async () => {
    if (patientsCache) return patientsCache;
    if (patientsRequest) return patientsRequest;

    patientsRequest = api
      .get('/patients')
      .then((response) => {
        patientsCache = response.data;
        if (response.data?.data && Array.isArray(response.data.data)) {
          saveLocalPatients(response.data.data);
        }
        return patientsCache;
      })
      .catch((error) => {
        console.warn('API /patients error, using cached/offline patients data:', error.message);
        const localList = getLocalPatients();
        patientsCache = { success: true, data: localList };
        return patientsCache;
      })
      .finally(() => {
        patientsRequest = null;
      });

    return patientsRequest;
  },

  getPatient: async (id) => {
    try {
      const response = await api.get(`/patients/${id}`);
      if (response.data?.data) {
        try {
          localStorage.setItem(`echoai_patient_${id}`, JSON.stringify(response.data));
        } catch {}
      }
      return response.data;
    } catch (error) {
      console.warn(`API /patients/${id} error, checking local store:`, error.message);
      try {
        const cached = localStorage.getItem(`echoai_patient_${id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
      const list = getLocalPatients();
      const found = list.find(
        (p) => String(p.id) === String(id) || String(p.patient_id) === String(id)
      );
      if (found) {
        return { success: true, data: found };
      }
      throw error;
    }
  },

  createPatient: async (patientData) => {
    try {
      const response = await api.post('/patients', patientData);
      invalidatePatients();
      if (response.data?.data) {
        const current = getLocalPatients();
        saveLocalPatients([response.data.data, ...current.filter((p) => String(p.id) !== String(response.data.data.id))]);
      }
      return response.data;
    } catch (error) {
      console.warn('API createPatient error, falling back to local storage:', error.message);
      const list = getLocalPatients();
      const newNumericId = Date.now();
      const createdPatient = {
        ...patientData,
        id: newNumericId,
        patient_id: patientData.patient_id || `PAT${String(newNumericId).slice(-6)}`,
        created_at: new Date().toISOString(),
      };
      const updatedList = [createdPatient, ...list];
      saveLocalPatients(updatedList);
      try {
        localStorage.setItem(`echoai_patient_${createdPatient.id}`, JSON.stringify({ success: true, data: createdPatient }));
        localStorage.setItem(`echoai_patient_${createdPatient.patient_id}`, JSON.stringify({ success: true, data: createdPatient }));
      } catch {}
      invalidatePatients();
      return { success: true, data: createdPatient };
    }
  },

  updatePatient: async (id, patientData) => {
    try {
      const response = await api.put(`/patients/${id}`, patientData);
      invalidatePatients();
      if (response.data?.data) {
        const current = getLocalPatients();
        saveLocalPatients(current.map((p) => (String(p.id) === String(id) ? { ...p, ...response.data.data } : p)));
      }
      return response.data;
    } catch (error) {
      const current = getLocalPatients();
      const updated = current.map((p) => (String(p.id) === String(id) ? { ...p, ...patientData } : p));
      saveLocalPatients(updated);
      invalidatePatients();
      return { success: true, data: { ...patientData, id } };
    }
  },

  deletePatient: async (id) => {
    try {
      const response = await api.delete(`/patients/${id}`);
      invalidatePatients();
      const current = getLocalPatients();
      saveLocalPatients(current.filter((p) => String(p.id) !== String(id)));
      return response.data;
    } catch (error) {
      const current = getLocalPatients();
      saveLocalPatients(current.filter((p) => String(p.id) !== String(id)));
      invalidatePatients();
      return { success: true, message: 'Patient deleted locally' };
    }
  },

  getAllVisits: async () => {
    try {
      const response = await api.get('/visits');
      return response.data;
    } catch {
      return { success: true, data: [] };
    }
  },

  getVisits: async (patientId) => {
    try {
      const response = await api.get(`/patients/${patientId}/visits`);
      if (response.data?.data) {
        try {
          localStorage.setItem(`echoai_visits_${patientId}`, JSON.stringify(response.data));
        } catch {}
      }
      return response.data;
    } catch {
      try {
        const cached = localStorage.getItem(`echoai_visits_${patientId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
      return { success: true, data: [] };
    }
  },

  addVisit: async (patientId, visitData) => {
    try {
      const response = await api.post(`/patients/${patientId}/visits`, visitData);
      invalidatePatients();
      return response.data;
    } catch {
      const newVisit = {
        ...visitData,
        id: Date.now(),
        patient_id: patientId,
        created_at: new Date().toISOString(),
      };
      try {
        const cachedRaw = localStorage.getItem(`echoai_visits_${patientId}`);
        const parsed = cachedRaw ? JSON.parse(cachedRaw) : { success: true, data: [] };
        const list = Array.isArray(parsed.data) ? parsed.data : [];
        localStorage.setItem(`echoai_visits_${patientId}`, JSON.stringify({ success: true, data: [newVisit, ...list] }));
      } catch {}
      invalidatePatients();
      return { success: true, data: newVisit };
    }
  },

  updateVisit: async (patientId, visitId, visitData) => {
    try {
      const response = await api.put(`/patients/${patientId}/visits/${visitId}`, visitData);
      invalidatePatients();
      return response.data;
    } catch {
      invalidatePatients();
      return { success: true, data: { ...visitData, id: visitId, patient_id: patientId } };
    }
  },

  deleteVisit: async (patientId, visitId) => {
    try {
      const response = await api.delete(`/patients/${patientId}/visits/${visitId}`);
      invalidatePatients();
      return response.data;
    } catch {
      invalidatePatients();
      return { success: true, message: 'Visit removed' };
    }
  },
};
