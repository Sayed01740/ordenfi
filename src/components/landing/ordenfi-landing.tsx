import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleDot, ClipboardList, Layers2, ShieldCheck, Wallet } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { ChainMark } from "@/components/brand/chain-mark";
import { LandingFeatureShowcase } from "./landing-feature-showcase";
import { KonaMotionToggle, LandingKona, LandingKonaMotion } from "./landing-kona";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { MagneticButton } from "@/components/ui/magnetic-button";
import KineticGrid from "@/components/ui/kinetic-grid";
import styles from "./ordenfi-landing.module.css";

const steps = [
  { title: "Connect your wallet", description: "Choose your Arc network and connect the account you want to use.", icon: Wallet },
  { title: "Review the details", description: "Check the recipient, amount and estimated fee before signing.", icon: ClipboardList },
  { title: "Confirm and track", description: "Approve in your wallet, then follow the transfer in Activity.", icon: ShieldCheck },
];

function AppLink() {
  return (
    <MagneticButton as={Link} href="/app" prefetch={false} className={styles.primary}>
      Go to App <ArrowRight size={16} aria-hidden="true" />
    </MagneticButton>
  );
}

export function OrdenfiLanding() {
  return (
    <LandingKonaMotion>
      <KineticGrid
        globalColor="ordenfi"
        transparentBg
        intensity={0.45}
        canvasClassName="opacity-25"
        className="bg-transparent"
      >
        <a className="skip-link" href="#landing-main">Skip to content</a>
        <header className={styles.header}>
          <nav aria-label="Primary" className={styles.nav}>
            <Link href="/" aria-current="page" aria-label="Ordenfi home" className={styles.brand}>
              <BrandLogo variant="full" height={32} priority />
            </Link>
            <div className={styles.navLinks}>
              <MagneticButton as="a" href="#features" strength={0.2}>Features</MagneticButton>
              <MagneticButton as="a" href="#workflow" strength={0.2}>How it works</MagneticButton>
              <MagneticButton as="a" href="#use-cases" strength={0.2}>Use cases</MagneticButton>
              <MagneticButton as={Link} href="/docs" strength={0.2}>Docs</MagneticButton>
            </div>
            <AppLink />
          </nav>
        </header>

        <main id="landing-main" tabIndex={-1} className="relative z-10 pb-12">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.horizon} aria-hidden="true" />
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroContent}>
              <h1 id="landing-title">Stablecoins. <span>In order.</span></h1>
              <p>Swap, send, and bridge USDC from one workspace on Arc.</p>
              <div className={styles.heroActions}>
                <AppLink />
                <MagneticButton as="a" href="#features" className={styles.textLink}>
                  Explore features <ArrowRight size={15} aria-hidden="true" />
                </MagneticButton>
              </div>
            </div>
            <figure className={styles.phoneFigure} data-mobile-concept>
              <div className={styles.phoneStage}>
                <div className={styles.phoneDevice} data-phone-device>
                  <div className={styles.phoneRail} aria-hidden="true" />
                  <div className={styles.phoneFrame}>
                    <Image
                      src="/landing/mobile-swap-screen.png"
                      alt="Ordenfi mobile app concept showing a USDC-to-EURC swap and the Connect wallet button"
                      width={371}
                      height={745}
                      sizes="(max-width: 51rem) 250px, 310px"
                      priority
                    />
                  </div>
                </div>
              </div>
              <LandingKona scene="hello" />
              <figcaption>Mobile app concept<KonaMotionToggle /></figcaption>
            </figure>
          </div>
        </section>

        <section id="features" className={styles.pageSection} aria-labelledby="features-title">
          <div className={`${styles.container} ${styles.sectionContent}`}>
            <div className={styles.sectionHeading}>
              <h2 id="features-title" className={styles.sectionTitle}>Stablecoin tools on Arc</h2>
              <LandingKona scene="scout" />
            </div>
            <LandingFeatureShowcase />
          </div>
        </section>

        <section id="workflow" className={styles.pageSection} aria-labelledby="workflow-title">
          <div className={`${styles.container} ${styles.workflowLayout}`}>
            <div className={styles.workflowIntro}>
              <h2 id="workflow-title" className={styles.sectionTitle}>From wallet to settlement</h2>
              <ol className={styles.steps}>
                {steps.map(({ title, description, icon: Icon }) => (
                  <li key={title}>
                    <div className={styles.stepIcon}><Icon size={19} aria-hidden="true" /></div>
                    <div><h3>{title}</h3><p>{description}</p></div>
                  </li>
                ))}
              </ol>
            </div>

            <div className={styles.workflowImages} aria-label="Example payment on Arc Testnet">
              <figure className={styles.workflowReview}>
                <div className={styles.captureImage}>
                  <Image src="/landing/payment-review.webp" alt="Ordenfi payment review for a sample 125 USDC transfer" width={896} height={792} sizes="(max-width: 51rem) 90vw, 460px" />
                </div>
                <figcaption className={`${styles.imageCaption} ${styles.workflowReviewCaption}`}>
                  <span>Payment review</span>
                  <LandingKona scene="guide" />
                </figcaption>
              </figure>
              <figure className={styles.workflowActivity}>
                <div className={styles.captureImage}>
                  <Image src="/landing/payment-activity.webp" alt="The same sample payment marked successful in Ordenfi's Activity timeline" width={1232} height={304} sizes="(max-width: 51rem) 90vw, 460px" />
                </div>
                <figcaption className={styles.imageCaption}>Sample transfer in Activity</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="use-cases" className={styles.pageSection} aria-labelledby="use-cases-title">
          <div className={`${styles.container} ${styles.sectionContent}`}>
            <div className={styles.sectionHeading}>
              <h2 id="use-cases-title" className={styles.sectionTitle}>Two ways to move USDC</h2>
              <LandingKona scene="courier" />
            </div>
            <div className={styles.useCases}>
              <article className={styles.useCase}>
                <div className={styles.caseVisual}>
                  <Image src="/landing/batch-review.webp" alt="Ordenfi's batch review with two sample recipients and the total for both payments" fill sizes="(max-width: 45rem) 90vw, 540px" />
                </div>
                <div className={styles.caseCopy}>
                  <h3>Run a batch payout</h3>
                  <p>Import up to 200 recipients from CSV or TSV and review one list. Approve each transfer in your wallet and export the results.</p>
                  <MagneticButton as={Link} href="/docs#batch-payroll" className={styles.textLink}>Batch payments guide <ArrowUpRight size={15} aria-hidden="true" /></MagneticButton>
                </div>
              </article>
              <article className={styles.useCase}>
                <div className={styles.caseVisual}>
                  <Image src="/landing/bridge-workspace.webp" alt="Ordenfi's Bridge form with a sample route from Base Sepolia to Arc Testnet" fill sizes="(max-width: 45rem) 90vw, 540px" />
                </div>
                <div className={styles.caseCopy}>
                  <h3>Move USDC across networks</h3>
                  <p>Review the bridge route and settlement method. Follow the transfer in Activity and verify it in the block explorer.</p>
                  <MagneticButton as={Link} href="/docs#bridge" className={styles.textLink}>Bridge guide <ArrowUpRight size={15} aria-hidden="true" /></MagneticButton>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>

      <CinematicFooter
        brandName="ORDENFI"
        heading="Put your USDC to work."
        subheading="Open Ordenfi to make your first Stablecoin transaction."
        topSlot={<LandingKona scene="farewell" />}
        primaryActionUrl="/app"
        primaryActionLabel="Go to App"
        docsUrl="/docs"
        variant="blended"
      />
      </KineticGrid>
    </LandingKonaMotion>
  );
}
