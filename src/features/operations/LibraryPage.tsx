import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  BookMarked,
  RotateCcw,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Users,
  X
} from 'lucide-react';
import { LibraryBook, LibraryLoan, Student, Teacher } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Card,
  StatCard,
  Button,
  Badge,
  EmptyState,
  ConfirmDialog
} from '../../components/ui/primitives';

interface LibraryViewProps {
  books: LibraryBook[];
  loans: LibraryLoan[];
  students: Student[];
  teachers?: Teacher[];
  onAddBook: (book: Omit<LibraryBook, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateBook: (id: string, book: Partial<LibraryBook>) => Promise<void>;
  onDeleteBook: (id: string) => Promise<void>;
  onIssueLoan: (loan: Omit<LibraryLoan, 'id' | 'createdAt'>) => Promise<void>;
  onReturnLoan: (loanId: string) => Promise<void>;
  theme?: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function LibraryPage({
  books,
  loans,
  students,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onIssueLoan,
  onReturnLoan
}: LibraryViewProps) {
  const [subTab, setSubTab] = useState<'catalog' | 'loans'>('catalog');
  const [search, setSearch] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [pendingDeleteBookId, setPendingDeleteBookId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Islamic Studies',
    totalCopies: 5,
    availableCopies: 5,
    location: 'Shelf A1'
  });

  const [loanForm, setLoanForm] = useState({
    bookId: '',
    borrowerId: '',
    borrowerName: '',
    borrowerType: 'Student' as 'Student' | 'Teacher' | 'Staff',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLoans = loans.filter(
    (l) =>
      l.bookTitle.toLowerCase().includes(search.toLowerCase()) ||
      l.borrowerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalCopies = books.reduce((acc, b) => acc + (Number(b.totalCopies) || 0), 0);
  const availableCopies = books.reduce(
    (acc, b) => acc + (Number(b.availableCopies) || 0),
    0
  );
  const activeLoans = loans.filter((l) => l.status !== 'Returned').length;

  const handleOpenAddBook = () => {
    setEditingBook(null);
    setBookForm({
      title: '',
      author: '',
      isbn: '',
      category: 'Islamic Studies',
      totalCopies: 5,
      availableCopies: 5,
      location: 'Shelf A1'
    });
    setShowBookModal(true);
  };

  const handleOpenEditBook = (book: LibraryBook) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category: book.category || 'General',
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      location: book.location || ''
    });
    setShowBookModal(true);
  };

  const handleSaveBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBook) {
      await onUpdateBook(editingBook.id, bookForm);
    } else {
      await onAddBook(bookForm);
    }
    setShowBookModal(false);
  };

  const handleOpenIssueLoan = (book?: LibraryBook) => {
    const firstAvailable = books.find((b) => b.availableCopies > 0);
    setLoanForm({
      bookId: book?.id || firstAvailable?.id || '',
      borrowerId: students[0]?.id || '',
      borrowerName: students[0]?.fullName || '',
      borrowerType: 'Student',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });
    setShowLoanModal(true);
  };

  const handleCreateLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const book = books.find((b) => b.id === loanForm.bookId);
    if (!book) return;
    await onIssueLoan({
      bookId: book.id,
      bookTitle: book.title,
      borrowerId: loanForm.borrowerId || loanForm.borrowerName,
      borrowerName: loanForm.borrowerName,
      borrowerType: loanForm.borrowerType,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: loanForm.dueDate,
      status: 'Borrowed'
    });
    setShowLoanModal(false);
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Maktabadda Dugsiga (Library & Books)"
        subtitle="Maamul buugaagta maktabadda, amaahinta ardayda, iyo soo celinta."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              icon={<BookMarked className="w-4 h-4 text-emerald-500" />}
              onClick={() => handleOpenIssueLoan()}
            >
              Amaahi Buug (Issue Book)
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddBook}
            >
              Ku dar Buug (Add Book)
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cinwaanada Buugaagta"
          value={books.length}
          icon={<BookOpen className="w-4 h-4" />}
          tone="default"
        />
        <StatCard
          label="Wadarta Nuqullada"
          value={totalCopies}
          icon={<BookMarked className="w-4 h-4" />}
          tone="info"
        />
        <StatCard
          label="Nuqullada Diyaarka ah"
          value={availableCopies}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="emerald"
        />
        <StatCard
          label="Amaahda Socota (Loans)"
          value={activeLoans}
          icon={<Clock className="w-4 h-4" />}
          tone="warning"
        />
      </div>

      {/* Tabs & Search */}
      <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              subTab === 'catalog'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Buugaagta ({books.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('loans')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              subTab === 'loans'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Amaahda Buugaagta ({loans.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Raadi buug, qoraa, ama arday..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Card>

      {subTab === 'catalog' ? (
        filteredBooks.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="Buugaag lama helin"
              description="Riix 'Ku dar Buug' si aad u bilowdo diiwaangelinta maktabadda."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenAddBook}
                >
                  Ku dar Buug (Add Book)
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <Card
                key={book.id}
                className="p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant="success">{book.category}</Badge>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBook(book)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteBookId(book.id)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                    Qoraaga: {book.author || 'N/A'} {book.isbn ? `• ISBN: ${book.isbn}` : ''}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[var(--color-text-muted)]">Kaydka: </span>
                    <span
                      className={`font-bold ${
                        book.availableCopies > 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {book.availableCopies} / {book.totalCopies}
                    </span>
                    {book.location && (
                      <span className="text-[var(--color-text-muted)] ml-2">
                        • {book.location}
                      </span>
                    )}
                  </div>
                  {book.availableCopies > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenIssueLoan(book)}
                      className="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg text-xs font-semibold transition-all"
                    >
                      Amaahi
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="overflow-hidden">
          {filteredLoans.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="Amaah buugaag lama helin"
              description="Dhammaan buugaagta waa la soo celiyay ama wali lama bixin."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <th className="py-3.5 px-4">Buugga (Book)</th>
                    <th className="py-3.5 px-4">Qofka Qaatay (Borrower)</th>
                    <th className="py-3.5 px-4">Taariikhda La Bixiyay</th>
                    <th className="py-3.5 px-4">Waqtiga Soo Celinta</th>
                    <th className="py-3.5 px-4">Xaaladda</th>
                    <th className="py-3.5 px-4 text-right">Ficil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-sm">
                  {filteredLoans.map((loan) => (
                    <tr
                      key={loan.id}
                      className="hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[var(--color-text-primary)]">
                        {loan.bookTitle}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[var(--color-text-primary)]">{loan.borrowerName}</span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                          {loan.borrowerType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-text-secondary)]">
                        {loan.issueDate}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-text-secondary)]">
                        {loan.dueDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={loan.status === 'Returned' ? 'success' : 'warning'}
                          dot
                        >
                          {loan.status === 'Returned'
                            ? `Returned (${loan.returnDate || ''})`
                            : 'Borrowed'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {loan.status !== 'Returned' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
                            onClick={() => onReturnLoan(loan.id)}
                          >
                            Soo Celi (Return)
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ds-surface-elevated rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingBook ? 'Wax ka beddel Buugga' : 'Ku dar Buug Cusub'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBookModal(false)}
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Cinwaanka Buugga (Title)
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Qoraaga (Author)
                  </label>
                  <input
                    type="text"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Qaybta (Category)
                  </label>
                  <input
                    type="text"
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Wadarta
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bookForm.totalCopies}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBookForm({
                        ...bookForm,
                        totalCopies: val,
                        availableCopies: val
                      });
                    }}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Diyaar ah
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={bookForm.availableCopies}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        availableCopies: Number(e.target.value)
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Shelf
                  </label>
                  <input
                    type="text"
                    value={bookForm.location}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, location: e.target.value })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowBookModal(false)}
                >
                  Jooji
                </Button>
                <Button variant="primary" type="submit">
                  Kaydi Buugga
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ds-surface-elevated rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Amaahi Buug (Issue Book Loan)
              </h3>
              <button
                type="button"
                onClick={() => setShowLoanModal(false)}
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Dooro Buugga
                </label>
                <select
                  required
                  value={loanForm.bookId}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, bookId: e.target.value })
                  }
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                >
                  <option value="">-- Dooro Buug --</option>
                  {books
                    .filter((b) => b.availableCopies > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.availableCopies} available)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Magaca Ardayga / Macalinka
                </label>
                <input
                  type="text"
                  required
                  list="borrowers-list"
                  value={loanForm.borrowerName}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, borrowerName: e.target.value })
                  }
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                />
                <datalist id="borrowers-list">
                  {students.map((s) => (
                    <option key={s.id} value={s.fullName} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Nooca
                  </label>
                  <select
                    value={loanForm.borrowerType}
                    onChange={(e) =>
                      setLoanForm({
                        ...loanForm,
                        borrowerType: e.target.value as 'Student' | 'Teacher' | 'Staff'
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Student">Arday (Student)</option>
                    <option value="Teacher">Macalin (Teacher)</option>
                    <option value="Staff">Shaqaale (Staff)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Taariikhda Soo Celinta
                  </label>
                  <input
                    type="date"
                    required
                    value={loanForm.dueDate}
                    onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                >
                  Jooji
                </Button>
                <Button variant="primary" type="submit">
                  Xaqiiji Amaahda
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteBookId !== null}
        title="Tirtir Buugga (Delete Book)"
        description="Ma hubtaa inaad buuggan ka saarto maktabadda?"
        confirmLabel="Haa, Tirtir"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setPendingDeleteBookId(null)}
        onConfirm={async () => {
          if (pendingDeleteBookId === null) return;
          setIsDeleting(true);
          try {
            await onDeleteBook(pendingDeleteBookId);
          } finally {
            setIsDeleting(false);
            setPendingDeleteBookId(null);
          }
        }}
      />
    </PageContainer>
  );
}
