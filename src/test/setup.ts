import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

afterEach(cleanup)
