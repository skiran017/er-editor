# Building a diagram — a worked example

Let's model a small Library. We'll add Books, Authors, Loans, and a derived attribute, then handle a weak entity (book copies). Total time: about 10 minutes.

## Entities

Place three entities:
- **Book** with attributes `title` (key), `isbn`, and `published` (a year).
- **Author** with attributes `id` (key) and `name`.
- **Loan** with attributes `loanDate` (key) and `dueDate`.

To add an attribute, pick the **Attribute** tool, drag onto the entity. Mark `title`, `id`, and `loanDate` as **key attributes** by selecting them and toggling the `Key` switch in the property pane.

## Relationships

- **writes** between Author and Book — relationship type **1:N** (an author writes many books, a book has one primary author).
- **borrowed-in** between Loan and Book — relationship type **N:1** (each loan involves one book; a book can appear in many loans).

## A weak entity

A library tracks individual physical copies. Add a **weak entity** **Copy** with a discriminant attribute `copyNumber` (mark it discriminant in the property pane). Connect it to **Book** with an **identifying relationship** — a relationship with **total participation** on the Copy side (double line).

## A derived attribute

Add an attribute `availableCopies` to **Book** and toggle `Derived` in the property pane (it appears with a dashed outline). Derived attributes don't participate in keys.

## End state

![Final Library diagram with Book, Author, Loan, Copy, and the relationships described above](/screenshots/library-final.png)

## Where to next

- [Properties](./properties) — the property pane in detail.
- [Cardinality & participation](./cardinality) — the rest of the relationship syntax.
- [Files](./files) — saving and reopening this diagram.
