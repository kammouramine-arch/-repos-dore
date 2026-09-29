import type { ServiceText } from "./services.ts";

/**
 * The seven AMYN services, in English.
 *
 * Same rules as the French copy: describe what a service CAN include, never
 * promise an outcome; no guaranteed rankings, store approval, traffic or
 * reviews. Written for an English-speaking reader, not translated line by
 * line.
 */
export const servicesEn: Record<string, ServiceText> = {
  "site-web": {
    name: "Website & redesign",
    short: "Website / redesign",
    summary:
      "A professional website that loads fast, reads well on a phone and is built around what your customers actually come looking for.",
    tagline: "A website that makes people call.",
    hero: {
      title: "A website that looks like your business,",
      accent: "and helps it work.",
      intro:
        "New site or redesign: we build websites and service pages that are understood in seconds, browsed on a phone and used to get in touch.",
    },
    problem: {
      title: "A website can exist and do nothing at all.",
      body: "Many business websites were built once, then forgotten. They look broken on mobile, bury the useful information and never say what to do next. Visitors leave without calling, booking or asking for a quote.",
      signs: [
        "The site is hard to read on a phone.",
        "Your services, opening hours or prices are hard to find.",
        "The site no longer reflects the quality of your work.",
        "You can't update it yourself.",
        "Enquiries rarely come through the website.",
      ],
    },
    solution: {
      title: "Start from your business, not from a template.",
      body: "We begin by understanding what your customers look for and what makes them decide. Structure, copy and design follow from that. The result is a clear, fast, mobile-first website with an obvious way to get in touch.",
    },
    deliverables: [
      "Bespoke business or brochure website",
      "Service pages and landing pages",
      "Redesign of an existing website",
      "Showcase of your work",
      "Contact or quote request form",
      "Booking tool integration",
      "Mobile and performance optimisation",
      "Search and local SEO foundations",
      "Analytics, with consent management where required",
    ],
    useCases: [
      { who: "Restaurant", need: "An up-to-date menu, opening hours and booking in two taps." },
      { who: "Tradesperson", need: "Past work shown at its best, better-qualified quote requests." },
      { who: "Consultancy", need: "Instant credibility, clear expertise, an easy first contact." },
      { who: "Shop", need: "What's new, how to get there, opening hours, a reason to visit." },
    ],
    scope: [
      "Number and type of pages",
      "Copywriting: supplied by you or written with our help",
      "Available photos and visuals",
      "Features: booking, advanced forms, client area",
      "Content migrated from an existing website",
    ],
    process: [
      { title: "Understand", body: "Your business, your customers, what the website needs to achieve." },
      { title: "Structure", body: "Sitemap, user journeys, the content required." },
      { title: "Build", body: "Design, development and content integration." },
      { title: "Launch", body: "Testing on phone and desktop, go-live, handover." },
    ],
    limits:
      "We lay solid foundations for search and local SEO. Nobody can guarantee a position on Google, and we don't promise one.",
    faq: [
      {
        q: "Can you redesign my existing website?",
        a: "Yes. We keep what already works, carry over the useful content and rebuild the rest. If your current site has a well-established address, we make sure existing links keep working.",
      },
      {
        q: "Will I be able to edit the website myself?",
        a: "Depending on your needs, we can include an editing interface for content that changes often (menu, news, projects). It's decided when we define the scope.",
      },
      {
        q: "Will my website appear at the top of search results?",
        a: "Nobody can honestly guarantee that. We build a technically clean, fast and well-structured website, which gives search a strong foundation. Rankings then depend on many external factors.",
      },
    ],
    seo: {
      title: "Website design and redesign",
      description:
        "Professional websites designed and rebuilt around your business: fast, clear and mobile-first. Priced on quote.",
    },
  },

  "suivi-demandes-devis": {
    name: "Request & quote tracking",
    short: "Request & quote tracking",
    summary:
      "A simple board that shows, at any moment, which requests are waiting for a reply, a quote or a follow-up.",
    tagline: "No enquiry left behind.",
    hero: {
      title: "No more enquiries",
      accent: "lost in an inbox.",
      intro:
        "A bespoke tracking tool to organise customer requests, missing information, quotes sent and follow-ups due — without adopting software that's too heavy for your business.",
    },
    problem: {
      title: "Requests come from everywhere. Tracking happens nowhere.",
      body: "A phone call, an email, a social media message, a form: every request arrives through a different channel. Notes end up in a notebook, emails stay unread as reminders, and some get lost. Quotes go out, but nobody knows which ones to chase.",
      signs: [
        "You don't know how many requests are waiting.",
        "Quotes are never followed up.",
        "There's often a missing detail before you can price a job.",
        "Several people reply without seeing the same history.",
      ],
    },
    solution: {
      title: "A board shaped around the way you sell.",
      body: "We build a simple tool with your own stages: new request, missing information, quote sent, follow-up, accepted. Each record keeps contact details, notes and the next action. It isn't a full CRM: it's the essentials, done well.",
    },
    deliverables: [
      "Request board organised by stage",
      "Customer records with contact details and notes",
      "Quote status tracking",
      "Next actions and follow-ups list",
      "Missing-information flags",
      "Requests received straight from your website form",
      "Secure access for you and your team",
    ],
    useCases: [
      { who: "Building trades", need: "Track site visits, quotes and follow-ups job by job." },
      { who: "Service business", need: "Bring together requests received by phone, email and website." },
      { who: "Catering, events", need: "See which dates are pencilled in and which quotes await an answer." },
    ],
    scope: [
      "Number of stages and fields to track",
      "Number of users",
      "Connection to your website form",
      "Import of existing data (spreadsheet, notebook)",
      "Notifications and reminders",
    ],
    process: [
      { title: "Observe", body: "How a request arrives, who handles it, where it gets lost." },
      { title: "Scope", body: "Stages, information to keep, access rights." },
      { title: "Build", body: "The tool, tested against your real situations." },
      { title: "Support", body: "Onboarding, then adjustments after the first few weeks." },
    ],
    limits:
      "We build a focused tracking tool. If what you need is a full CRM (marketing automation, built-in accounting…), we'll tell you when we define the scope.",
    faq: [
      {
        q: "Is it a CRM?",
        a: "Not in the sense of a complete sales management suite. It's a tracking tool designed around your stages, with the essentials: requests, customers, quotes, follow-ups and notes. It can grow as your needs do.",
      },
      {
        q: "Is my data protected?",
        a: "Access is protected by login, and your customers' data is only used for your business. Hosting and security measures are agreed during scoping, before anything goes live.",
      },
      {
        q: "Can I get my data back?",
        a: "Yes. Exporting your data is planned from the moment the tool is designed.",
      },
    ],
    seo: {
      title: "Request and quote tracking tool",
      description:
        "A bespoke tool to track customer requests, quotes, follow-ups and next actions. Simple, and designed around your business. Priced on quote.",
    },
  },

  "application-mobile": {
    name: "Mobile app",
    short: "Mobile app",
    summary:
      "An iOS or Android app designed for one clear purpose: your customers, your team, your work in the field.",
    tagline: "Your service, in their pocket.",
    hero: {
      title: "An app,",
      accent: "when it genuinely needs to exist.",
      intro:
        "Customer apps, internal apps, booking or tracking spaces: we design bespoke iOS and Android apps, after checking with you that an app really is the right answer.",
    },
    problem: {
      title: "Some things don't fit in a website.",
      body: "A customer who comes back every week, a team working in the field, tracking that needs to live in a pocket: for these uses, a website quickly shows its limits. On the other hand, many apps are built without a real need and never get opened.",
      signs: [
        "Your customers come back often and repeat the same steps.",
        "Your team writes on paper what should be entered on site.",
        "You need notifications or offline access.",
        "Your current tools can't be used on a phone.",
      ],
    },
    solution: {
      title: "Check the need first. Then build it properly.",
      body: "We start by defining exactly what the app is for and what its first version must do. Depending on the project, we build for iOS, Android or both, with a cross-platform approach when it makes sense. Scope and feasibility are always confirmed before development begins.",
    },
    deliverables: [
      "Customer app (account, booking, tracking, loyalty)",
      "Internal app for your team",
      "Dashboard and client area",
      "Notifications",
      "Connection to your existing tools (API, back office)",
      "iOS, Android or cross-platform development",
      "Support with App Store and Google Play submission",
    ],
    useCases: [
      { who: "Salon, beauty studio", need: "Book, find upcoming appointments, get a reminder." },
      { who: "Field service company", need: "Job sheets, photos and signatures on site." },
      { who: "Club, studio", need: "Timetable, sign-ups, memberships, messages to members." },
    ],
    scope: [
      "Target platforms: iOS, Android or both",
      "Number of screens and user journeys",
      "User accounts and roles",
      "Connections to external services",
      "Offline use, notifications",
      "Admin back office",
    ],
    process: [
      { title: "Qualify", body: "The need, the users, technical feasibility." },
      { title: "Prototype", body: "Key screens, tested before any code is written." },
      { title: "Develop", body: "In stages, with regular test builds." },
      { title: "Publish", body: "Store listings, submission, follow-up." },
    ],
    limits:
      "Publication depends on Apple's and Google's rules. We prepare the app to meet them, but no agency can guarantee acceptance on the App Store or Google Play.",
    faq: [
      {
        q: "Can you build an iPhone and Android app?",
        a: "Yes. Depending on the project, we build one app per platform or a single cross-platform app. The choice is made during scoping, based on features, budget and long-term maintenance.",
      },
      {
        q: "Does my project need an app?",
        a: "Not always. If a well-designed website does the job, we'll tell you: it's simpler and costs less. An app makes sense for regular use or features that belong on a phone.",
      },
      {
        q: "Will the app be accepted on the stores?",
        a: "We prepare it to meet Apple's and Google's rules and support you through submission. The final decision is theirs: we can't guarantee it.",
      },
    ],
    seo: {
      title: "iOS and Android app development",
      description:
        "Bespoke iOS and Android apps: customer apps, internal tools, booking and client areas. Need and feasibility confirmed before development. Priced on quote.",
    },
  },

  "reservation-en-ligne": {
    name: "Online booking",
    short: "Online booking",
    summary:
      "Customers book when it suits them, even at 11pm. You stay in control of your availability.",
    tagline: "Bookings, even at 11pm.",
    hero: {
      title: "Bookings,",
      accent: "without the phone ringing mid-service.",
      intro:
        "We set up a booking system that fits your business: your services, your availability, your rules. Built into your website, and synced with your calendar where possible.",
    },
    problem: {
      title: "Every manual booking costs time.",
      body: "Answering the phone mid-appointment, calling back, writing in a paper diary, handling cancellations by text: manual booking interrupts your work and loses customers who simply wanted to book online.",
      signs: [
        "You take appointments by phone or message.",
        "Customers give up when nobody answers.",
        "No-shows and late cancellations cost you slots.",
        "Your current tool doesn't match your services.",
      ],
    },
    solution: {
      title: "Your rules, applied automatically.",
      body: "We configure or build booking around the way you work: service lengths, breaks, minimum notice, available staff or rooms. Depending on the tool, bookings can send a confirmation and reminders, and sync with your calendar.",
    },
    deliverables: [
      "Choice or development of the booking tool",
      "Services and availability set-up",
      "Booking requests or instant bookings",
      "Appointment confirmation",
      "Automatic reminders, where the tool allows",
      "Calendar sync",
      "Management of bookings and customer details",
      "Integration into your website",
    ],
    useCases: [
      { who: "Hairdresser, barber", need: "Appointments by service and by stylist." },
      { who: "Restaurant", need: "Table bookings with covers and sittings." },
      { who: "Practitioner, consultant", need: "Consultation slots, reminders, information collected beforehand." },
    ],
    scope: [
      "Configured existing tool or bespoke system",
      "Number of services, staff and locations",
      "Payment or deposit at booking",
      "Email or SMS reminders",
      "Calendar sync",
    ],
    process: [
      { title: "Understand", body: "Your services, your constraints, your habits." },
      { title: "Choose", body: "Existing tool or custom build, depending on the need." },
      { title: "Configure", body: "Rules, availability, messages, website integration." },
      { title: "Test", body: "Trial bookings, adjustments, handover." },
    ],
    limits:
      "Reminders, calendar sync and payment depend on the tool chosen. We tell you exactly what will be in place before we start.",
    faq: [
      {
        q: "Do I need a bespoke tool?",
        a: "Not necessarily. For many businesses, a well-configured existing tool is enough. A custom build makes sense when your booking rules are unusual.",
      },
      {
        q: "Are reminders automatic?",
        a: "They can be, depending on the tool. We confirm it during scoping, along with the available channels (email, SMS).",
      },
      {
        q: "Can I keep approving bookings manually?",
        a: "Yes. A booking can be a simple request you confirm, or an instant booking. It's your call.",
      },
    ],
    seo: {
      title: "Online booking set-up",
      description:
        "Online booking that fits your business: services, availability, confirmations and reminders depending on the tool. Built into your website. Priced on quote.",
    },
  },

  "google-business": {
    name: "Google Business Profile",
    short: "Google Business Profile",
    summary:
      "A complete, accurate and well-presented business profile: what many customers see before your website.",
    tagline: "First impressions, handled with care.",
    hero: {
      title: "Your Google profile,",
      accent: "as good as your business.",
      intro:
        "We improve the information on your Google Business Profile: categories, description, services, opening hours, photos and consistency with your website. Accurate, well-presented information — nothing artificial.",
    },
    problem: {
      title: "An incomplete profile makes a poor first impression.",
      body: "For many customers, your business profile is the first contact with your company. Wrong opening hours, a vague category, old photos, an empty description: small details like these are enough to send people to a competitor.",
      signs: [
        "Opening hours or phone number are out of date.",
        "The description is empty or generic.",
        "Photos are few, old or poor quality.",
        "The information differs from your website.",
      ],
    },
    solution: {
      title: "Accurate information, presented with care.",
      body: "We review your profile and suggest improvements that follow Google's guidelines: relevant categories, a clear description, detailed services, photo recommendations and consistency with your website and other online listings.",
    },
    deliverables: [
      "Full review of the profile information",
      "Category selection",
      "Business description copywriting",
      "Service descriptions",
      "Photo recommendations",
      "Consistency with your website and other listings",
      "Advice on managing reviews",
    ],
    useCases: [
      { who: "Restaurant, café", need: "Accurate hours, the menu, photos that make people hungry." },
      { who: "Tradesperson", need: "Service area, detailed services, past work." },
      { who: "Local shop", need: "Practical information, what's new, how to get there." },
    ],
    scope: [
      "Current state of the profile",
      "Number of locations",
      "Service descriptions to write",
      "Photos available or to be taken",
    ],
    process: [
      { title: "Observe", body: "Your current profile and what your customers see." },
      { title: "Recommend", body: "The corrections and improvements that matter most." },
      { title: "Apply", body: "With your access, or by guiding you step by step." },
      { title: "Check", body: "Final consistency with your website and social channels." },
    ],
    limits:
      "We don't promise the top spot, a guaranteed ranking, or any volume of traffic or reviews. We never create fake reviews or offer anything in exchange for one.",
    faq: [
      {
        q: "Can you improve my Google profile?",
        a: "Yes: information, categories, description, services, photo recommendations and consistency with your website. What nobody can guarantee is a position in the results.",
      },
      {
        q: "Do I need to give you access to my profile?",
        a: "It's the simplest option, through a manager access you can remove at any time. We can also guide you so you make the changes yourself.",
      },
      {
        q: "Can you get us reviews?",
        a: "We can advise you on how to ask happy customers for a review, within Google's rules. We never create or buy reviews.",
      },
    ],
    seo: {
      title: "Google Business Profile improvement",
      description:
        "Better information on your Google Business Profile: categories, description, services, photos. No ranking promises. Priced on quote.",
    },
  },

  "onboarding-client": {
    name: "Client onboarding",
    short: "Client onboarding",
    summary:
      "A clear welcome journey, so every new client knows what to do, what to send and what to expect.",
    tagline: "Every new client, guided.",
    hero: {
      title: "A new client",
      accent: "should never have to ask “what now?”.",
      intro:
        "We design digital onboarding journeys: forms, step-by-step checklists, document collection and clear instructions. Clients move forward on their own; you save the back-and-forth.",
    },
    problem: {
      title: "A working relationship starts in the details.",
      body: "Documents sent in several batches, forgotten information, the same questions answered by email again and again: the first days with a new client take a lot of time and can leave an impression of disorder.",
      signs: [
        "You send the same explanations to every new client.",
        "There's always one document missing before you can start.",
        "Clients don't know where their file stands.",
        "Information is scattered across emails and files.",
      ],
    },
    solution: {
      title: "A guided journey that feels like you.",
      body: "We turn your kick-off into a journey: a welcome screen, the steps to follow, the information and documents to provide, and what happens next. Depending on the need, it takes the form of a guided form, a dedicated page or a client area.",
    },
    deliverables: [
      "Guided welcome form",
      "Welcome screen and overview of the steps",
      "Kick-off checklist",
      "Document collection",
      "Instructions and next steps",
      "Client area, if needed",
      "Automated steps where they make sense",
    ],
    useCases: [
      { who: "Accountant, adviser", need: "Collect documents before the first meeting." },
      { who: "Agency, studio", need: "Gather content, access and approvals at kick-off." },
      { who: "Training, coaching", need: "Welcome, inform and prepare for the first session." },
    ],
    scope: [
      "Number of steps and documents",
      "Public page or secure client area",
      "Automations (emails, reminders)",
      "Connection to your existing tools",
    ],
    process: [
      { title: "Map", body: "What happens today between signature and kick-off." },
      { title: "Simplify", body: "The steps that matter, in the right order." },
      { title: "Design", body: "The journey, its screens and its messages." },
      { title: "Launch", body: "First clients supported, then adjustments." },
    ],
    faq: [
      {
        q: "Do I need a client area?",
        a: "Not always. A guided form and a clear page are often enough. A client area makes sense when clients need to come back and follow their file.",
      },
      {
        q: "Are collected documents secure?",
        a: "Storage and access are defined during scoping, according to the nature of the documents. Sensitive data needs specific precautions, which we set out before building anything.",
      },
    ],
    seo: {
      title: "Client onboarding journeys",
      description:
        "Digital onboarding for new clients: forms, steps, document collection and a client area when needed. Priced on quote.",
    },
  },

  "portfolio-contenu": {
    name: "Portfolio & content",
    short: "Portfolio & content",
    summary:
      "Your real work, presented the way it deserves: projects, galleries, case studies and services.",
    tagline: "Your work, finally shown at its best.",
    hero: {
      title: "Your work speaks for itself.",
      accent: "It still needs to be shown well.",
      intro:
        "We structure and present your projects: galleries, case studies, genuine before-and-afters, service pages. Using your real, authorised content only.",
    },
    problem: {
      title: "Great work, poorly presented, goes unnoticed.",
      body: "Photos scattered across a phone, an Instagram account, an old PDF: many businesses have excellent work but nothing to present it properly at the moment a customer hesitates.",
      signs: [
        "Your projects are spread across several places.",
        "Photos are neither sorted nor captioned.",
        "You send images one by one to prospects.",
        "Your projects don't explain what you solved.",
      ],
    },
    solution: {
      title: "Sort, structure, tell the story.",
      body: "Together we select your most representative projects, then present them with context, brief, the solution delivered and visuals. Everything fits into your website or stands alone as a presentation.",
    },
    deliverables: [
      "Portfolio structure",
      "Project galleries",
      "Case study layouts",
      "Service presentation",
      "Project descriptions",
      "Before-and-afters, when genuine",
      "Organisation of existing content",
    ],
    useCases: [
      { who: "Joiner, interior designer", need: "Projects in pictures, with materials and constraints." },
      { who: "Photographer, creative", need: "Coherent series, smooth browsing." },
      { who: "Renovation company", need: "Documented before-and-afters, by type of job." },
    ],
    scope: [
      "Number of projects to present",
      "Photos available, retouching or new shoots needed",
      "Copywriting",
      "Website integration or standalone document",
    ],
    process: [
      { title: "Gather", body: "Photos, documents, details on each project." },
      { title: "Select", body: "The projects that best show your craft." },
      { title: "Shape", body: "Structure, copy, galleries, layout." },
      { title: "Integrate", body: "Into your website, or as a presentation to share." },
    ],
    limits:
      "We only use content you own the rights to or are authorised to use — including your clients' consent when they can be identified.",
    faq: [
      {
        q: "I don't have great photos. What can I do?",
        a: "We tell you what can be used, what can be improved and what's worth redoing. If new photography is needed, we say so during scoping.",
      },
      {
        q: "Can I show work done at my clients' homes?",
        a: "Yes, with their consent when they or their home can be recognised. We help you prepare that request simply.",
      },
    ],
    seo: {
      title: "Portfolio and project presentation",
      description:
        "Structured, well-presented projects: galleries, case studies and services, using your real and authorised content. Priced on quote.",
    },
  },
};
