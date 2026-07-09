export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r rounded-2xl from-emerald-50 via-teal-50 to-sky-100 text-slate-700 py-12 border-t border-slate-200 font-sans relative overflow-hidden">
      
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl overflow-hidden pointer-events-none opacity-30">
         <div className="absolute -top-[50%] -left-[10%] w-[50%] h-[100%] rounded-full bg-emerald-200 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Top Section: Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          
          {/* 1. Brand & About */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <div className="bg-white p-2 rounded-xl inline-block mb-6 shadow-md">
              <img 
                src='../ImgBox/Dhiu.jpg' 
                alt="Darul Huda" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-700 font-bold px-2">Darul Huda</span>';
                }}
              />
            </div>
            <p className="text-slate-600 text-sm leading-relaxed max-w-sm mb-6">
              Empowering communities through education. Dedicated to fostering excellence and holistic development across all our off-campuses and national institutes.
            </p>
          </div>

          {/* 2. Our Off Campuses */}
          <div>
            <h4 className="text-slate-900 font-bold tracking-wide uppercase text-sm mb-6">Our Off-Campuses</h4>
            <ul className="space-y-3 text-sm">
              {[
                'DH NIICS Chemmad',
                'DH NIICS Hangal',
                'DH NIICS Punganur',
                'DH NIICS Maharashtra',
                'DH NIICS Wadoli',
                'DH NIICS Assam',
                'DH NIICS Bengal'
              ].map((campus, index) => (
                <li key={index}>
                  <a href="#" className="text-slate-600 hover:text-emerald-600 transition-colors duration-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>
                    {campus}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Social Media */}
          <div>
            <h4 className="text-slate-900 font-bold tracking-wide uppercase text-sm mb-6">Connect With Us</h4>
            <div className="flex flex-col space-y-4">
              <a href="#" className="text-slate-600 hover:text-pink-500 transition-colors duration-200 flex items-center gap-3 text-sm font-medium group">
                <div className="p-2 rounded-lg bg-white shadow group-hover:bg-pink-100 transition">
                   {/* Instagram Icon */}
                   <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6.01 4.9.07 1.2.06 2 .25 2.5.42a4.7 4.7 0 011.7 1.1 4.7 4.7 0 011.1 1.7c.17.5.36 1.3.42 2.5.06 1.3.07 1.7.07 4.9s-.01 3.6-.07 4.9c-.06 1.2-.25 2-.42 2.5a4.7 4.7 0 01-1.1 1.7 4.7 4.7 0 01-1.7 1.1c-.5.17-1.3.36-2.5.42-1.3.06-1.7.07-4.9.07s-3.6-.01-4.9-.07c-1.2-.06-2-.25-2.5-.42a4.7 4.7 0 01-1.7-1.1 4.7 4.7 0 01-1.1-1.7c-.17-.5-.36-1.3-.42-2.5-.06-1.3-.07-1.7-.07-4.9s.01-3.6.07-4.9c.06-1.2.25-2 .42-2.5a4.7 4.7 0 011.1-1.7 4.7 4.7 0 011.7-1.1c.5-.17 1.3-.36 2.5-.42 1.3-.06 1.7-.07 4.9-.07z"/></svg>
                </div>
                Instagram
              </a>
              
              <a href="#" className="text-slate-600 hover:text-pink-500 transition-colors duration-200 flex items-center gap-3 text-sm font-medium group">
                <div className="p-2 rounded-lg bg-white shadow group-hover:bg-pink-100 transition">
                   {/* Instagram Icon */}
                   <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6.01 4.9.07 1.2.06 2 .25 2.5.42a4.7 4.7 0 011.7 1.1 4.7 4.7 0 011.1 1.7c.17.5.36 1.3.42 2.5.06 1.3.07 1.7.07 4.9s-.01 3.6-.07 4.9c-.06 1.2-.25 2-.42 2.5a4.7 4.7 0 01-1.1 1.7 4.7 4.7 0 01-1.7 1.1c-.5.17-1.3.36-2.5.42-1.3.06-1.7.07-4.9.07s-3.6-.01-4.9-.07c-1.2-.06-2-.25-2.5-.42a4.7 4.7 0 01-1.7-1.1 4.7 4.7 0 01-1.1-1.7c-.17-.5-.36-1.3-.42-2.5-.06-1.3-.07-1.7-.07-4.9s.01-3.6.07-4.9c.06-1.2.25-2 .42-2.5a4.7 4.7 0 011.1-1.7 4.7 4.7 0 011.7-1.1c.5-.17 1.3-.36 2.5-.42 1.3-.06 1.7-.07 4.9-.07z"/></svg>
                </div>
                Facebook
              </a>
              <a href="#" className="text-slate-600 hover:text-pink-500 transition-colors duration-200 flex items-center gap-3 text-sm font-medium group">
                <div className="p-2 rounded-lg bg-white shadow group-hover:bg-pink-100 transition">
                   {/* Instagram Icon */}
                   <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6.01 4.9.07 1.2.06 2 .25 2.5.42a4.7 4.7 0 011.7 1.1 4.7 4.7 0 011.1 1.7c.17.5.36 1.3.42 2.5.06 1.3.07 1.7.07 4.9s-.01 3.6-.07 4.9c-.06 1.2-.25 2-.42 2.5a4.7 4.7 0 01-1.1 1.7 4.7 4.7 0 01-1.7 1.1c-.5.17-1.3.36-2.5.42-1.3.06-1.7.07-4.9.07s-3.6-.01-4.9-.07c-1.2-.06-2-.25-2.5-.42a4.7 4.7 0 01-1.7-1.1 4.7 4.7 0 01-1.1-1.7c-.17-.5-.36-1.3-.42-2.5-.06-1.3-.07-1.7-.07-4.9s.01-3.6.07-4.9c.06-1.2.25-2 .42-2.5a4.7 4.7 0 011.1-1.7 4.7 4.7 0 011.7-1.1c.5-.17 1.3-.36 2.5-.42 1.3-.06 1.7-.07 4.9-.07z"/></svg>
                </div>
                You Tube
              </a>
              

              {/* Add Facebook, YouTube similarly with lighter hover colors */}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {currentYear} Darul Huda. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-slate-600">
            <a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Contact Us</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
