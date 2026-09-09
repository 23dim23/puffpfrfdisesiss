import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionViewer from './components/SectionViewer';
import ServicesCatalogue from './components/ServicesCatalogue';
import ReelsWidget from './components/ReelsWidget';
import ReviewsBlock from './components/ReviewsBlock';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import AdminPanel from './components/AdminPanel';

import { Section, Service, Review, ContactInfo, AdminSettings, Reel } from './types';
import { 
  INITIAL_SECTIONS, 
  INITIAL_SERVICES, 
  INITIAL_REVIEWS, 
  INITIAL_REELS, 
  DEFAULT_CONTACTS 
} from './data';
import { auth } from './lib/firebase';
import { 
  testFirestoreConnection, 
  getSections, 
  getServices, 
  getReviews, 
  getContacts, 
  saveSection, 
  saveService, 
  deleteService, 
  saveReview, 
  deleteReview, 
  saveContacts 
} from './lib/db';

export default function App() {
  // Navigation State
  const [activeSectionId, setActiveSectionId] = useState<string>('home');

  // Core App Content States
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [contacts, setContacts] = useState<ContactInfo>(DEFAULT_CONTACTS);
  const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);

  // Loading/saving overlay states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals / Overlays Visibility States
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingPackage, setSelectedBookingPackage] = useState<string | undefined>(undefined);
  const [selectedBookingPrice, setSelectedBookingPrice] = useState<number | undefined>(undefined);

  // Load Firestore data on initial mount
  useEffect(() => {
    async function initAndLoadData() {
      setIsLoading(true);
      try {
        await testFirestoreConnection();
        const dbSections = await getSections();
        const dbServices = await getServices();
        const dbReviews = await getReviews();
        const dbContacts = await getContacts();

        setSections(dbSections);
        setServices(dbServices);
        setReviews(dbReviews);
        setContacts(dbContacts);
      } catch (err) {
        console.error("Failed to fetch custom database from Firestore. Using static fallback.", err);
      } finally {
        setIsLoading(false);
      }
    }
    initAndLoadData();
  }, []);

  // Handle Admin settings update
  const handleSaveAdminSettings = async (newSettings: AdminSettings) => {
    setIsSaving(true);
    try {
      const isAdmin = auth.currentUser?.email === 'karpenkoov32@gmail.com';

      // Update state locally first so UI is snappy
      setServices(newSettings.services);
      setReviews(newSettings.reviews);
      setContacts(newSettings.contacts);
      
      const updatedSections = sections.map(sec => ({
        ...sec,
        isActive: newSettings.visibleSections[sec.id] !== undefined ? newSettings.visibleSections[sec.id] : sec.isActive,
        ...(newSettings.sectionsContent[sec.id] || {})
      }));
      setSections(updatedSections);

      // If signed in as admin, persist to Firestore!
      if (isAdmin) {
        // Save contacts
        await saveContacts(newSettings.contacts);

        // Save sections
        for (const sec of updatedSections) {
          await saveSection(sec);
        }

        // Save services
        for (const srv of newSettings.services) {
          await saveService(srv);
        }
        // Delete services from Firestore that are no longer in the set
        const existingServices = await getServices();
        const newServiceIds = new Set(newSettings.services.map(s => s.id));
        for (const srv of existingServices) {
          if (!newServiceIds.has(srv.id)) {
            await deleteService(srv.id);
          }
        }

        // Save reviews
        for (const rev of newSettings.reviews) {
          await saveReview(rev);
        }
        // Delete reviews from Firestore that are no longer in the set
        const existingReviews = await getReviews();
        const newReviewIds = new Set(newSettings.reviews.map(r => r.id));
        for (const rev of existingReviews) {
          if (!newReviewIds.has(rev.id)) {
            await deleteReview(rev.id);
          }
        }
      } else {
        // Fallback: save to localStorage in local preview mode
        localStorage.setItem('lazertag_sections', JSON.stringify(updatedSections));
        localStorage.setItem('lazertag_services', JSON.stringify(newSettings.services));
        localStorage.setItem('lazertag_reviews', JSON.stringify(newSettings.reviews));
        localStorage.setItem('lazertag_contacts', JSON.stringify(newSettings.contacts));
      }
    } catch (err) {
      console.error('Error saving to Firestore:', err);
      alert('Ошибка при сохранении в базу данных. Пожалуйста, убедитесь, что вы вошли в систему как администратор.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new review directly from the UI
  const handleAddReview = async (newReview: Review) => {
    try {
      setReviews(prev => [newReview, ...prev]);
      await saveReview(newReview);
    } catch (err) {
      console.error('Error saving review to Firestore:', err);
      // Local fallback on exception
      const saved = localStorage.getItem('lazertag_reviews');
      const localRev = saved ? JSON.parse(saved) : INITIAL_REVIEWS;
      localStorage.setItem('lazertag_reviews', JSON.stringify([newReview, ...localRev]));
    }
  };

  // Trigger booking modal for a specific package/service
  const handleBookPackage = (packageName: string, price?: number) => {
    setSelectedBookingPackage(packageName);
    setSelectedBookingPrice(price);
    setIsBookingOpen(true);
  };

  const handleOpenGeneralBooking = () => {
    setSelectedBookingPackage(undefined);
    setSelectedBookingPrice(undefined);
    setIsBookingOpen(true);
  };

  // Scroll to services list helper
  const scrollToServices = () => {
    const el = document.getElementById('services-catalogue');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to Reels Atmosphere helper
  const scrollToAtmosphere = () => {
    const el = document.getElementById('atmosphere-vibe');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to active section container helper
  const handleSectionChange = (id: string) => {
    setActiveSectionId(id);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const currentSection = sections.find(s => s.id === activeSectionId);

  // Prepare current admin settings model
  const adminSettings: AdminSettings = {
    visibleSections: sections.reduce((acc, sec) => {
      acc[sec.id] = sec.isActive;
      return acc;
    }, {} as { [id: string]: boolean }),
    sectionsContent: sections.reduce((acc, sec) => {
      acc[sec.id] = {
        heroTitle: sec.heroTitle,
        heroSubtitle: sec.heroSubtitle,
        description: sec.description,
        contentMarkdown: sec.contentMarkdown
      };
      return acc;
    }, {} as { [id: string]: Partial<Section> }),
    services,
    reviews,
    contacts
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Cyberpunk grid bg */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated loading ring */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-cyan-500 border-r-cyan-500 rounded-full animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-900 border border-cyan-500/30 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-black text-cyan-400">LT</span>
            </div>
          </div>
          
          <h2 className="text-sm font-black text-white uppercase tracking-widest mt-6 animate-pulse">
            Загрузка Арены...
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1.5 font-bold">
            Синхронизация с Firestore DB
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500 selection:text-black">
      
      {/* Interactive Global Laser tag Header */}
      <Navbar 
        sections={sections}
        activeSectionId={activeSectionId}
        onSectionChange={handleSectionChange}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenBooking={handleOpenGeneralBooking}
      />

      {/* Conditional page render based on selected navigation tab */}
      {activeSectionId === 'home' && currentSection ? (
        <>
          {/* Hero Banner Section */}
          <Hero 
            onExplore={scrollToServices}
            onOpenBooking={handleOpenGeneralBooking}
            onOpenAtmosphere={scrollToAtmosphere}
            heroTitle={currentSection.heroTitle}
            heroSubtitle={currentSection.heroSubtitle}
          />

          {/* Atmospheric Reels Videos block (Resolves vertical clip requirement) */}
          <ReelsWidget reels={reels} />

          {/* Interactive Services / Products Catalogue */}
          <ServicesCatalogue 
            services={services}
            onBookService={handleBookPackage}
          />

          {/* Reviews Slider / Grid block with verified icons */}
          <ReviewsBlock 
            reviews={reviews}
            onAddReview={handleAddReview}
          />
        </>
      ) : (
        currentSection && (
          <SectionViewer 
            section={currentSection}
            contacts={contacts}
            onBookPackage={handleBookPackage}
            onOpenBooking={handleOpenGeneralBooking}
          />
        )
      )}

      {/* Styled Footer with map & socials links */}
      <Footer contacts={contacts} />

      {/* Booking Form Overlay Drawer */}
      <BookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        packageName={selectedBookingPackage}
        packagePrice={selectedBookingPrice}
      />

      {/* Passcode protected Administration Dashboard */}
      {isAdminOpen && (
        <AdminPanel 
          settings={adminSettings}
          onSaveSettings={handleSaveAdminSettings}
          sections={sections}
          onSaveSections={setSections}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

    </div>
  );
}
