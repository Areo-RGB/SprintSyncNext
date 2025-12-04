# SprintSync PWA Setup and Testing Guide

## 🚀 Quick Start

### For Development (HTTPS Required)

1. **Setup SSL Certificates** (one-time setup):
```bash
npm run setup-ssl
```

2. **Trust the Certificate**:
   - **macOS**: Double-click `certificates/ca.crt` → Add to Keychain Access → System → Always Trust
   - **Linux**: `sudo cp certificates/ca.crt /usr/local/share/ca-certificates/localhost-ca.crt && sudo update-ca-certificates`
   - **Windows**: Double-click `certificates/ca.crt` → Install Certificate → Current User → Trusted Root

3. **Run with HTTPS**:
```bash
npm run dev:https-key
```

4. **Test PWA Installation**:
   - Open browser to `https://localhost:3000`
   - Look for install icon in address bar
   - Check Application tab in DevTools

### For Production

Deploy to any platform that provides HTTPS (Vercel, Netlify, etc.). The PWA will work automatically!

## 🛠️ PWA Features

### ✅ What's Fixed

1. **HTTPS Support**: PWA now requires HTTPS (except localhost)
2. **Enhanced Manifest**: Added shortcuts, screenshots, categories
3. **Smart Caching**:
   - Cache-first for static assets
   - Network-first for API calls
   - Stale-while-revalidate for pages
4. **Installation Prompt**: Custom install banner with smooth UX
5. **Service Worker**: Improved with multiple caching strategies
6. **Offline Support**: Dedicated offline page with helpful info

### 📱 Installation

**Chrome/Edge (Android)**:
- Visit app over HTTPS
- Click install icon in address bar
- Confirm installation

**Safari (iOS)**:
- Visit app over HTTPS
- Tap Share button
- Select "Add to Home Screen"

**Desktop (Chrome/Edge)**:
- Install icon appears in address bar
- Or use install button in app

## 🔍 Testing PWA

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Application tab
3. Check:
   - Manifest: Validate manifest.json
   - Service Workers: Verify registration
   - Storage: Check cache contents
   - Install: Test installation

### Lighthouse Audit
```bash
npm run audit:pwa
```

### Manual Checklist
- [ ] Serves over HTTPS
- [ ] Manifest loads correctly
- [ ] Service worker registers
- [ ] Install prompt appears
- [ ] Works offline
- [ ] Icon displays correctly
- [ ] Splash screen shows
- [ ] Starts quickly

## 📋 Scripts Added

```json
{
  "dev:https": "Run with basic HTTPS",
  "dev:https-key": "Run with custom SSL certificates",
  "build:pwa": "Build with service worker optimization",
  "setup-ssl": "Generate SSL certificates",
  "audit:pwa": "Run PWA audit"
}
```

## 🔧 Troubleshooting

### Installation Not Working?
1. Check HTTPS status
2. Verify manifest.json is accessible
3. Ensure service worker is registered
4. Clear browser cache and try again

### Service Worker Issues?
1. Check Console for errors
2. Update cache version in sw.js
3. Unregister service worker in DevTools
4. Refresh page

### Offline Not Working?
1. Check if caching strategy is working
2. Verify offline fallback page
3. Test with Chrome DevTools offline mode

## 📊 PWA Metrics

The improved PWA now supports:
- **Offline functionality**: ✓
- **Installable**: ✓
- **Fast loading**: ✓ (via caching)
- **Push notifications**: ✓ (ready)
- **Background sync**: ✓ (ready)
- **App-like experience**: ✓

## 🚀 Next Steps

1. Test on multiple devices
2. Add push notification subscriptions
3. Implement background sync for real-time updates
4. Add more offline features
5. Consider web app manifest for deep links