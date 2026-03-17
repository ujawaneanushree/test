import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-8">
            Terms & <span className="text-gradient">Conditions</span>
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using CineSphere, you accept and agree to be bound by the terms and 
                provisions of this agreement. If you do not agree to abide by these terms, please do 
                not use this service.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">2. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and password. 
                You agree to accept responsibility for all activities that occur under your account. 
                You must immediately notify us of any unauthorized use of your account.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">3. Storage Plans & Subscriptions</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                CineSphere offers various storage plans:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Free Plan:</strong> 4 GB of storage at no cost</li>
                <li><strong>Basic Plan:</strong> 8 GB of storage for ₹99/month</li>
                <li><strong>Pro Plan:</strong> 10 GB of storage for ₹149/month</li>
                <li><strong>Premium Plan:</strong> 20 GB of storage for ₹249/month</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Subscriptions are billed monthly and can be cancelled at any time. Upon cancellation, 
                you will retain access until the end of your billing period.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">4. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to use the service to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Upload or share copyrighted content without permission</li>
                <li>Distribute malware or harmful software</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">5. Content Ownership</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of all content you upload to CineSphere. By uploading content, 
                you grant us a limited license to store, display, and transmit your content solely 
                for the purpose of providing our services.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">6. Room Hosting</h2>
              <p className="text-muted-foreground leading-relaxed">
                Room hosts are responsible for managing their rooms and the content shared within them. 
                Hosts have the authority to invite, approve, or remove members. Misuse of hosting 
                privileges may result in account suspension.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                CineSphere is provided "as is" without warranties of any kind. We shall not be liable 
                for any indirect, incidental, special, consequential, or punitive damages resulting 
                from your use of or inability to use the service.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">8. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to terminate or suspend your account at any time for violations 
                of these terms. Upon termination, your right to use the service will immediately cease, 
                and your data may be deleted.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">9. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of 
                significant changes via email or through the service. Continued use after changes 
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">10. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms & Conditions, please contact us at{" "}
                <a href="mailto:legal@cinesphere.com" className="text-primary hover:underline">
                  legal@cinesphere.com
                </a>
              </p>
            </section>

            <p className="text-sm text-muted-foreground text-center pt-4">
              Last updated: January 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
