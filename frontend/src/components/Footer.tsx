import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-16 bg-nu-blue text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={64} />
          <div>
            <p className="text-lg font-bold leading-tight">Equipment Borrowing System</p>
            <p className="text-sm text-white/75">National University Clark</p>
          </div>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/75">
          A student project for CTADWEBL (Advanced Web Programming). This is not an official National
          University website.
        </p>
      </div>
    </footer>
  );
}
