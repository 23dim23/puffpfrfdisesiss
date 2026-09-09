import { 
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, getDocFromServer 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Section, Service, Review, ContactInfo } from '../types';
import { 
  INITIAL_SECTIONS, 
  INITIAL_SERVICES, 
  INITIAL_REVIEWS, 
  DEFAULT_CONTACTS 
} from '../data';

// Validate Connection on Boot as requested by guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'config', 'contacts'));
    console.log("Firestore connection test completed.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client appears to be offline.");
    }
  }
}

// --- Sections DB Sync ---
export async function getSections(): Promise<Section[]> {
  const colPath = 'sections';
  try {
    const querySnapshot = await getDocs(collection(db, colPath));
    if (querySnapshot.empty) {
      // Seed with initial sections
      console.log('Sections collection is empty. Seeding defaults...');
      for (const sec of INITIAL_SECTIONS) {
        try {
          await setDoc(doc(db, colPath, sec.id), sec);
        } catch (writeErr) {
          console.warn(`Seeding section ${sec.id} skipped (likely unauthorized):`, writeErr);
        }
      }
      return INITIAL_SECTIONS;
    }
    const sectionsList: Section[] = [];
    querySnapshot.forEach((docSnap) => {
      sectionsList.push(docSnap.data() as Section);
    });
    // Return sorted sections to preserve logical order as in INITIAL_SECTIONS
    const orderMap = INITIAL_SECTIONS.reduce((acc, sec, idx) => {
      acc[sec.id] = idx;
      return acc;
    }, {} as Record<string, number>);
    return sectionsList.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    return INITIAL_SECTIONS;
  }
}

export async function saveSection(section: Section): Promise<void> {
  const path = `sections/${section.id}`;
  try {
    await setDoc(doc(db, 'sections', section.id), section);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Services DB Sync ---
export async function getServices(): Promise<Service[]> {
  const colPath = 'services';
  try {
    const querySnapshot = await getDocs(collection(db, colPath));
    if (querySnapshot.empty) {
      console.log('Services collection is empty. Seeding defaults...');
      for (const srv of INITIAL_SERVICES) {
        try {
          await setDoc(doc(db, colPath, srv.id), srv);
        } catch (writeErr) {
          console.warn(`Seeding service ${srv.id} skipped (likely unauthorized):`, writeErr);
        }
      }
      return INITIAL_SERVICES;
    }
    const servicesList: Service[] = [];
    querySnapshot.forEach((docSnap) => {
      servicesList.push(docSnap.data() as Service);
    });
    return servicesList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    return INITIAL_SERVICES;
  }
}

export async function saveService(service: Service): Promise<void> {
  const path = `services/${service.id}`;
  try {
    await setDoc(doc(db, 'services', service.id), service);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteService(id: string): Promise<void> {
  const path = `services/${id}`;
  try {
    await deleteDoc(doc(db, 'services', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Reviews DB Sync ---
export async function getReviews(): Promise<Review[]> {
  const colPath = 'reviews';
  try {
    const querySnapshot = await getDocs(collection(db, colPath));
    if (querySnapshot.empty) {
      console.log('Reviews collection is empty. Seeding defaults...');
      for (const rev of INITIAL_REVIEWS) {
        try {
          await setDoc(doc(db, colPath, rev.id), rev);
        } catch (writeErr) {
          console.warn(`Seeding review ${rev.id} skipped (likely unauthorized):`, writeErr);
        }
      }
      return INITIAL_REVIEWS;
    }
    const reviewsList: Review[] = [];
    querySnapshot.forEach((docSnap) => {
      reviewsList.push(docSnap.data() as Review);
    });
    // Sort reviews by date descending if possible, or keep order
    return reviewsList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    return INITIAL_REVIEWS;
  }
}

export async function saveReview(review: Review): Promise<void> {
  const path = `reviews/${review.id}`;
  try {
    await setDoc(doc(db, 'reviews', review.id), review);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteReview(id: string): Promise<void> {
  const path = `reviews/${id}`;
  try {
    await deleteDoc(doc(db, 'reviews', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Contacts DB Sync ---
export async function getContacts(): Promise<ContactInfo> {
  const path = 'config/contacts';
  try {
    const docSnap = await getDoc(doc(db, 'config', 'contacts'));
    if (!docSnap.exists()) {
      console.log('Contacts document does not exist. Seeding defaults...');
      try {
        await setDoc(doc(db, 'config', 'contacts'), DEFAULT_CONTACTS);
      } catch (writeErr) {
        console.warn('Seeding contacts skipped (likely unauthorized):', writeErr);
      }
      return DEFAULT_CONTACTS;
    }
    return docSnap.data() as ContactInfo;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return DEFAULT_CONTACTS;
  }
}

export async function saveContacts(contacts: ContactInfo): Promise<void> {
  const path = 'config/contacts';
  try {
    await setDoc(doc(db, 'config', 'contacts'), contacts);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
