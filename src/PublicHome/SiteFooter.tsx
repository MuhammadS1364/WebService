import dhiuLogo from '../ImgBox/Dhiu.jpg';

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-r rounded-4xl from-emerald-50 via-teal-50 to-sky-100 text-slate-700 border-t border-slate-200 overflow-hidden">

      {/* Background Watermark */}
      <div
        className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none bg-no-repeat bg-center"
        style={{
          backgroundImage: `url(${dhiuLogo})`,
          backgroundSize: '100%',
          backgroundPosition: 'center'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Section 1: Brand & Aim (Combined for better flow) */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              {/* <div className="bg-white p-3 rounded-xl inline-block shadow-sm mb-4">
                <img src={dhiuLogo} alt="Darul Huda" className="h-70 w-auto" />
              </div> */}
              <h2 className="text-lg font-bold text-slate-900 mb-2">Darul Huda Islamic University</h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-sm">
                Empowering communities through education. Dedicated to fostering excellence and holistic development across all our off-campuses and national institutes.
              </p>
            </div>

            <div>
              <h4 className="text-slate-900 font-bold uppercase text-xs tracking-wider mb-3">Our Aim</h4>
              <ul className="flex flex-wrap gap-4 text-sm font-medium text-emerald-800">
                <li className="bg-emerald-100/50 px-3 py-1 rounded-full">Ta'leem</li>
                <li className="bg-emerald-100/50 px-3 py-1 rounded-full">Tarbiyyah</li>
                <li className="bg-emerald-100/50 px-3 py-1 rounded-full">Da'wa</li>
              </ul>
            </div>
          </div>

          {/* Section 2: Off-Campuses */}
          <div>
            <h4 className="text-slate-900 font-bold tracking-wide uppercase text-xs mb-6">Our Off-Campuses</h4>
            <ul className="space-y-3 text-sm">
              {['DH NIICS Chemmad', 'DH NIICS Hangal', 'DH NIICS Punganur', 'DH NIICS Maharashtra', 'DH NIICS Wadoli', 'DH NIICS Assam', 'DH NIICS Bengal'].map((campus) => (
                <li key={campus}>
                  <a href="#" className="text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                    {campus}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Connect */}
          <div>
            <h4 className="text-slate-900 font-bold tracking-wide uppercase text-xs mb-6">Connect With Us</h4>
            <div className="flex flex-col gap-3">
              {['Instagram', 'Facebook', 'YouTube'].map((social) => (
                <a key={social} href="#" className="text-slate-600 hover:text-emerald-600 transition-colors text-sm font-medium">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>&copy; {currentYear} Darul Huda. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-emerald-600">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}