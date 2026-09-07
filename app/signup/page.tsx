"use client";

import { AuthForm, AuthFormLoading } from "@/src/components/auth/auth-form";
import { Icon } from "@/src/components/icons";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { ButtonLink } from "@/src/components/ui/button";
import { Heading } from "@/src/components/ui/heading";
import { motion, useReducedMotion } from "motion/react";
import { Suspense } from "react";

function SignupContent() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="auth-canvas flex min-h-svh flex-col px-4 py-8">
      <nav className="flex items-center">
        <ButtonLink href="/" variant="ghost" size="field">
          <Icon name="left" size={16} />
          <span>Home</span>
        </ButtonLink>
      </nav>
      <motion.div
        data-auth-content
        className="flex flex-1 flex-col items-center justify-center py-6 sm:py-12"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      >
        <div className="flex w-full max-w-sm flex-col items-center">
          <span className="neu-raised bg-surface text-primary mb-8 flex size-14 items-center justify-center rounded-2xl">
            <Icon name="school" size={27} />
          </span>
          <Heading as="h1" size="title" className="mb-2 text-center">
            Create an account
          </Heading>
          <p className="text-muted mb-6 text-center text-sm">Sign up to start using Reodite — it&apos;s free</p>
          <Suspense fallback={<AuthFormLoading label="Loading sign up" />}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </motion.div>
      <footer className="flex items-center justify-center pb-2">
        <ThemeToggle />
      </footer>
    </div>
  );
}

export default function SignupPage() {
  return <SignupContent />;
}
