"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(180deg,#0b1120_0%,#111827_45%,#1f2937_100%)] text-white">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
        >
          ← Ana Sayfa
        </button>

        <section className="overflow-hidden rounded-[28px] border border-white/12 bg-white/8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="border-b border-white/10 px-6 py-6 sm:px-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-200">
              🔒 Gizlilik Politikası
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              CinChef Gizlilik Politikası
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Bu politika, CinChef uygulamasını kullanırken hangi verilerin işlendiğini,
              bu verilerin hangi amaçlarla kullanıldığını ve kullanıcı haklarını açıklar.
            </p>

            <p className="mt-3 text-xs text-white/45">
              Son güncelleme: 2026
            </p>
          </div>

          <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">1. Toplanan Veriler</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                CinChef aşağıdaki veri türlerini işleyebilir:
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  <li>Kullanıcının manuel olarak girdiği malzeme ve içecek bilgileri</li>
                  <li>Kamera veya dosya yükleme ile sağlanan görseller</li>
                  <li>Tarif ve kokteyl oluşturma sırasında girilen kullanıcı tercihleri</li>
                  <li>Uygulama performansı ve hata takibi için teknik kullanım verileri</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">2. Verilerin Kullanım Amacı</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                Toplanan veriler şu amaçlarla kullanılabilir:
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  <li>Kullanıcının yüklediği içerikten malzeme veya şişe tespiti yapmak</li>
                  <li>Kişiselleştirilmiş tarif ve kokteyl önerileri oluşturmak</li>
                  <li>Adım adım tarif akışını ve sesli rehberi sunmak</li>
                  <li>Uygulama deneyimini, doğruluğu ve performansı geliştirmek</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">3. Veri Paylaşımı</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                CinChef kullanıcı verilerini satmaz. Veriler, yalnızca uygulama işlevlerini
                yerine getirmek amacıyla gerekli teknik servis sağlayıcılarla sınırlı ölçüde
                işlenebilir. Bu işleme, tarif oluşturma veya görsel analiz gibi hizmetler için
                kullanılan altyapı servisleri dahil olabilir.
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">4. Kamera ve Görseller</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                Kullanıcı tarafından çekilen veya yüklenen görseller, yalnızca içerik analizi,
                malzeme tanıma ve tarif/kokteyl önerisi oluşturma amacıyla işlenir. Kullanıcının
                açık eylemi olmadan kamera kullanılmaz.
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">5. Veri Güvenliği</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                CinChef, kullanıcı verilerini korumak amacıyla makul teknik ve idari önlemler
                uygular. Buna rağmen internet üzerinden yapılan veri iletimlerinin tamamen risksiz
                olduğu garanti edilemez.
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">6. Kullanıcı Hakları</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                Kullanıcılar, kendi verilerine ilişkin bilgi talep edebilir ve uygun durumlarda
                silme veya güncelleme talebinde bulunabilir. Bu tür talepler için aşağıdaki iletişim
                adresi kullanılabilir.
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">7. Çocukların Gizliliği</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                CinChef, 13 yaş altındaki çocuklara yönelik olarak tasarlanmamıştır. Uygulamanın
                bu yaş grubuna ait verileri bilerek toplaması amaçlanmaz.
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">8. Politika Güncellemeleri</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                Bu gizlilik politikası zaman zaman güncellenebilir. Güncel sürüm bu sayfada
                yayınlanır ve yayınlandığı anda yürürlüğe girer.
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-yellow-200">9. İletişim</h2>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 text-white/80">
                Gizlilik politikasıyla ilgili sorular için bizimle iletişime geçebilirsiniz:
                <div className="mt-3 inline-flex rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 font-semibold text-yellow-100">
                  destek@cinchef.com
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}