export const siteConfig = {
  siteName: 'Moto Prionas',
  sellerName: 'Κωνσταντίνος Πριόνας',
  domain: process.env.NEXT_PUBLIC_SITE_URL || 'https://motoprionas.gr',
  phoneDisplay: '698 041 2648',
  phoneE164: '+306980412648',
  viberNumber: '+306980412648',
  address: 'Τριών Ιεραρχών 57',
  postcode: '60150',
  city: 'Νέα Έφεσος Πιερίας',
  email: null,
  instagram: 'https://www.instagram.com/moto_prionas/?hl=el',
  map: {
    lat: 40.2274351,
    lng: 22.5052622,
    embedUrl: 'https://www.google.com/maps?q=40.2274351,22.5052622&z=17&output=embed'
  },
  maxPhotos: 20
} as const;
