import {expect,it,vi} from 'vitest';
import {Rating} from 'ts-fsrs';
import type {FavoriteItem} from '@/types/favorite';
const context=vi.hoisted(()=>({database:{favorites:{update:vi.fn(),toArray:vi.fn()},favoriteFolders:{toArray:vi.fn()}}}));
vi.mock('@/lib/db',()=>({get db(){return context.database;}}));
import {useFavoriteStore} from '../favorite-store';
it('does not apply an old account grade after account switch',async()=>{
 const favorite:FavoriteItem={id:'same',text:'old account',normalizedText:'old account',translation:'old',type:'word',folderId:'default',targetLang:'zh',autoCollected:false,createdAt:1,updatedAt:1};
 useFavoriteStore.setState({favorites:[favorite],isLoaded:true});
 let finish!:(value:number)=>void;
 context.database.favorites.update.mockImplementation(()=>new Promise<number>(resolve=>{finish=resolve;}));
 const pending=useFavoriteStore.getState().gradeReview('same',Rating.Good);
 context.database={favorites:{update:vi.fn(),toArray:vi.fn()},favoriteFolders:{toArray:vi.fn()}};
 useFavoriteStore.setState({favorites:[{...favorite,text:'new account'}]});
 finish(1);
 await expect(pending).rejects.toThrow('Account changed');
 expect(useFavoriteStore.getState().favorites[0]).not.toHaveProperty('fsrsCard');
 expect(useFavoriteStore.getState().favorites[0].text).toBe('new account');
});

it('does not reuse or apply a delayed load from the previous account',async()=>{
 let finish!:(value:FavoriteItem[])=>void;
 const old:FavoriteItem={id:'old',text:'private old',normalizedText:'old',translation:'old',type:'word',folderId:'default',targetLang:'zh',autoCollected:false,createdAt:1,updatedAt:1};
 useFavoriteStore.setState({favorites:[],folders:[],isLoaded:false});
 context.database={favorites:{update:vi.fn(),toArray:vi.fn(()=>new Promise<FavoriteItem[]>(resolve=>{finish=resolve;}))},favoriteFolders:{toArray:vi.fn().mockResolvedValue([])}};
 const pending=useFavoriteStore.getState().loadFavorites();
 const current={...old,id:'new',text:'new account'};
 context.database={favorites:{update:vi.fn(),toArray:vi.fn().mockResolvedValue([current])},favoriteFolders:{toArray:vi.fn().mockResolvedValue([])}};
 const next=useFavoriteStore.getState().loadFavorites();
 finish([old]);
 await Promise.all([pending,next]);
 expect(context.database.favorites.toArray).toHaveBeenCalledTimes(1);
 expect(useFavoriteStore.getState().favorites.map(item=>item.id)).toEqual(['new']);
});
